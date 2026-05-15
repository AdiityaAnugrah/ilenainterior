const router = require('express').Router();
const pool = require('../config/db');
const APICacheManager = require('../cache/CacheManager');
const queryOptimizer = require('../database/QueryOptimizer');

// Initialize cache manager with appropriate TTL
const cacheManager = new APICacheManager({
  defaultTTL: 300000, // 5 minutes default
  maxSize: 200,
  enableStats: true,
});

// Cache middleware with custom TTL for different routes
const cacheMiddleware = (ttl) => {
  return (req, res, next) => {
    if (req.method !== 'GET') {
      return next();
    }

    const key = cacheManager.generateKey(req);
    const cached = cacheManager.get(key);

    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }

    res.set('X-Cache', 'MISS');
    const originalJson = res.json.bind(res);
    
    res.json = (data) => {
      cacheManager.set(key, data, ttl);
      return originalJson(data);
    };

    next();
  };
};

// Cache invalidation middleware for mutations
const invalidateProductsCache = (req, res, next) => {
  // Invalidate all products-related cache entries
  const invalidated = cacheManager.invalidate(/GET:\/products/);
  console.log(`[Cache Invalidation] Invalidated ${invalidated} products cache entries`);
  next();
};

// GET all products dengan filter & search
router.get('/', cacheMiddleware(300000), async (req, res) => { // 5 minutes cache
  const { category, search, min_price, max_price, sort = 'created_at', order = 'DESC', page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let where = ['p.is_active = 1'];
  const params = [];

  if (category && category !== 'all') {
    where.push('p.category = ?');
    params.push(category);
  }
  if (search) {
    where.push('(p.name LIKE ? OR p.description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (min_price) {
    where.push('p.price >= ?');
    params.push(parseFloat(min_price));
  }
  if (max_price) {
    where.push('p.price <= ?');
    params.push(parseFloat(max_price));
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const allowedSort = ['price', 'name', 'created_at'];
  const sortCol = allowedSort.includes(sort) ? `p.${sort}` : 'p.created_at';
  const sortOrder = order === 'ASC' ? 'ASC' : 'DESC';

  try {
    // OPTIMIZED: Single query with GROUP_CONCAT to avoid N+1 problem
    // Compatible with MySQL 5.7+ (JSON_ARRAYAGG requires MySQL 8.0+)
    // Uses indexes: idx_products_is_active, idx_products_category, idx_products_created_at, idx_variants_product_id
    const rows = await queryOptimizer.execute(
      `SELECT 
        p.id,
        p.sku,
        p.name,
        p.category,
        p.description,
        p.price,
        p.dimensions,
        p.thumbnail,
        p.model_3d,
        p.model_2d_topdown,
        p.tags,
        p.stock,
        p.is_active,
        p.created_at,
        p.updated_at,
        GROUP_CONCAT(
          DISTINCT CONCAT_WS('|', pv.id, pv.name, pv.color, pv.model_3d, pv.stock)
          SEPARATOR ';;'
        ) as variants_raw
      FROM products p
      LEFT JOIN product_variants pv ON pv.product_id = p.id
      ${whereClause}
      GROUP BY p.id, p.sku, p.name, p.category, p.description, p.price, p.dimensions, 
               p.thumbnail, p.model_3d, p.model_2d_topdown, p.tags, p.stock, p.is_active, 
               p.created_at, p.updated_at
      ORDER BY ${sortCol} ${sortOrder}
      LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    // OPTIMIZED: Separate count query for better performance
    // Uses same indexes as main query
    const countRows = await queryOptimizer.execute(
      `SELECT COUNT(DISTINCT p.id) as total FROM products p ${whereClause}`,
      params
    );

    // Parse variants from GROUP_CONCAT result
    const products = rows.map(r => {
      let variants = [];
      if (r.variants_raw) {
        variants = r.variants_raw.split(';;').map(v => {
          const [id, name, color, model_3d, stock] = v.split('|');
          return { id: parseInt(id), name, color, model_3d, stock: parseInt(stock) };
        });
      }
      
      return {
        id: r.id,
        sku: r.sku,
        name: r.name,
        category: r.category,
        description: r.description,
        price: r.price,
        dimensions: typeof r.dimensions === 'string' ? JSON.parse(r.dimensions || '{}') : r.dimensions,
        thumbnail: r.thumbnail,
        model_3d: r.model_3d,
        model_2d_topdown: r.model_2d_topdown,
        tags: typeof r.tags === 'string' ? JSON.parse(r.tags || '[]') : r.tags,
        stock: r.stock,
        is_active: r.is_active,
        created_at: r.created_at,
        updated_at: r.updated_at,
        variants,
      };
    });

    res.json({
      data: products,
      total: countRows[0].total,
      page: parseInt(page),
      totalPages: Math.ceil(countRows[0].total / parseInt(limit)),
    });
  } catch (error) {
    console.error('[Products API Error]', error);
    res.status(500).json({ message: 'Error fetching products' });
  }
});

// GET single product
router.get('/:id', cacheMiddleware(600000), async (req, res) => { // 10 minutes cache
  try {
    // OPTIMIZED: Single query with GROUP_CONCAT (compatible with MySQL 5.7+)
    // Uses indexes: PRIMARY KEY on p.id, idx_variants_product_id for JOIN
    const rows = await queryOptimizer.execute(
      `SELECT 
        p.id,
        p.sku,
        p.name,
        p.category,
        p.description,
        p.price,
        p.dimensions,
        p.thumbnail,
        p.model_3d,
        p.model_2d_topdown,
        p.tags,
        p.stock,
        p.is_active,
        p.created_at,
        p.updated_at,
        GROUP_CONCAT(
          DISTINCT CONCAT_WS('|', pv.id, pv.name, pv.color, pv.model_3d, pv.stock)
          SEPARATOR ';;'
        ) as variants_raw
      FROM products p
      LEFT JOIN product_variants pv ON pv.product_id = p.id
      WHERE p.id = ? AND p.is_active = 1
      GROUP BY p.id, p.sku, p.name, p.category, p.description, p.price, p.dimensions, 
               p.thumbnail, p.model_3d, p.model_2d_topdown, p.tags, p.stock, p.is_active, 
               p.created_at, p.updated_at`,
      [req.params.id]
    );

    if (rows.length === 0) return res.status(404).json({ message: 'Produk tidak ditemukan' });

    // Parse variants from GROUP_CONCAT result
    let variants = [];
    if (rows[0].variants_raw) {
      variants = rows[0].variants_raw.split(';;').map(v => {
        const [id, name, color, model_3d, stock] = v.split('|');
        return { id: parseInt(id), name, color, model_3d, stock: parseInt(stock) };
      });
    }

    const product = {
      id: rows[0].id,
      sku: rows[0].sku,
      name: rows[0].name,
      category: rows[0].category,
      description: rows[0].description,
      price: rows[0].price,
      dimensions: typeof rows[0].dimensions === 'string' ? JSON.parse(rows[0].dimensions || '{}') : rows[0].dimensions,
      thumbnail: rows[0].thumbnail,
      model_3d: rows[0].model_3d,
      model_2d_topdown: rows[0].model_2d_topdown,
      tags: typeof rows[0].tags === 'string' ? JSON.parse(rows[0].tags || '[]') : rows[0].tags,
      stock: rows[0].stock,
      is_active: rows[0].is_active,
      created_at: rows[0].created_at,
      updated_at: rows[0].updated_at,
      variants,
    };

    res.json(product);
  } catch (error) {
    console.error('[Product Detail API Error]', error);
    res.status(500).json({ message: 'Error fetching product' });
  }
});

// GET categories list
router.get('/meta/categories', cacheMiddleware(300000), async (req, res) => { // 5 minutes cache
  try {
    // OPTIMIZED: Uses composite index idx_products_category_active (if available) or idx_products_is_active + idx_products_category
    // Efficient GROUP BY with COUNT aggregation
    const rows = await queryOptimizer.execute(
      `SELECT 
        category, 
        COUNT(*) as count,
        MIN(price) as min_price,
        MAX(price) as max_price,
        AVG(price) as avg_price
      FROM products 
      WHERE is_active = 1 
      GROUP BY category
      ORDER BY category ASC`
    );
    res.json(rows);
  } catch (error) {
    console.error('[Categories API Error]', error);
    res.status(500).json({ message: 'Error fetching categories' });
  }
});

module.exports = router;
