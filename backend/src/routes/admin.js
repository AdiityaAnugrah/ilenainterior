const router    = require('express').Router();
const pool      = require('../config/db');
const adminAuth = require('../middleware/adminAuth');
const upload    = require('../middleware/upload');
const { optimizeUploadedAsset } = require('../middleware/upload');
const path      = require('path');
const fs        = require('fs');

// Import cache managers from route files
const APICacheManager = require('../cache/CacheManager');

// Initialize cache managers for invalidation
const productsCacheManager = new APICacheManager({
  defaultTTL: 300000,
  maxSize: 200,
  enableStats: true,
});

const wallpapersCacheManager = new APICacheManager({
  defaultTTL: 300000,
  maxSize: 200,
  enableStats: true,
});

// Cache invalidation middleware
const invalidateProductsCache = (req, res, next) => {
  const invalidated = productsCacheManager.invalidate(/GET:\/products/);
  console.log(`[Cache Invalidation] Invalidated ${invalidated} products cache entries`);
  next();
};

const invalidateWallpapersCache = (req, res, next) => {
  const invalidated = wallpapersCacheManager.invalidate(/GET:\/wallpapers/);
  console.log(`[Cache Invalidation] Invalidated ${invalidated} wallpapers cache entries`);
  next();
};

// Helper — URL publik file upload
const fileUrl = (filename, type = 'images') =>
  filename ? `/uploads/${type}/${path.basename(filename)}` : null;

const IMAGE_MAX = 5  * 1024 * 1024;  //  5 MB
const MODEL_MAX = 15 * 1024 * 1024;  // 15 MB

// Validasi ukuran per-tipe setelah multer menyimpan file, hapus yang oversized
function validateFileSizes(req, res) {
  const thumb = req.files?.thumbnail?.[0];
  const model = req.files?.model_3d?.[0];

  if (thumb && thumb.size > IMAGE_MAX) {
    fs.unlink(thumb.path, () => {});
    res.status(400).json({ message: `Foto terlalu besar. Maksimal 5 MB (sekarang ${(thumb.size / 1024 / 1024).toFixed(1)} MB).` });
    return false;
  }
  if (model && model.size > MODEL_MAX) {
    fs.unlink(model.path, () => {});
    res.status(400).json({ message: `File 3D terlalu besar. Maksimal 15 MB (sekarang ${(model.size / 1024 / 1024).toFixed(1)} MB). Gunakan Draco compression saat export dari Polycam/KIRI Engine.` });
    return false;
  }
  return true;
}

// ─── PRODUCTS ────────────────────────────────────────────────────────────────

// GET all products (admin — termasuk yang tidak aktif)
router.get('/products', adminAuth, async (req, res) => {
  const { search, category, status, stock, page = 1, limit = 30 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let where = [], params = [];

  if (search) { where.push('(p.name LIKE ? OR p.sku LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
  if (category && category !== 'all') { where.push('p.category = ?'); params.push(category); }
  if (status === 'active')   where.push('p.is_active = 1');
  if (status === 'inactive') where.push('p.is_active = 0');
  if (stock === 'out')   where.push('p.stock = 0');
  if (stock === 'low')   where.push('p.stock > 0 AND p.stock <= 5');
  if (stock === 'in')    where.push('p.stock > 5');

  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT p.*, COUNT(pv.id) as variant_count
       FROM products p LEFT JOIN product_variants pv ON pv.product_id = p.id
       ${clause} GROUP BY p.id ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    const [count] = await conn.query(`SELECT COUNT(*) as total FROM products p ${clause}`, params);
    res.json({
      data: rows.map(r => ({ ...r, dimensions: JSON.parse(r.dimensions || '{}'), tags: JSON.parse(r.tags || '[]') })),
      total: count[0].total,
    });
  } finally { conn.release(); }
});

// GET single product (admin)
router.get('/products/:id', adminAuth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Produk tidak ditemukan' });
    const [variants] = await conn.query('SELECT * FROM product_variants WHERE product_id = ?', [req.params.id]);
    const p = rows[0];
    res.json({ ...p, dimensions: JSON.parse(p.dimensions || '{}'), tags: JSON.parse(p.tags || '[]'), variants });
  } finally { conn.release(); }
});

// POST create product (dengan upload)
router.post('/products',
  adminAuth,
  upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'model_3d',  maxCount: 1 },
  ]),
  optimizeUploadedAsset,
  invalidateProductsCache,
  async (req, res) => {
    if (!validateFileSizes(req, res)) return;

    const { sku, name, category, description, price, width, depth, height, tags, stock } = req.body;
    if (!sku || !name || !category || !price)
      return res.status(400).json({ message: 'SKU, nama, kategori, dan harga wajib diisi' });

    const thumbnailPath = req.files?.thumbnail?.[0]?.filename
      ? fileUrl(req.files.thumbnail[0].filename, 'images') : null;
    const modelPath = req.files?.model_3d?.[0]?.filename
      ? fileUrl(req.files.model_3d[0].filename, 'models') : null;

    const dimensions = JSON.stringify({
      width:  parseFloat(width)  || 0,
      depth:  parseFloat(depth)  || 0,
      height: parseFloat(height) || 0,
    });
    const tagsJson = JSON.stringify(
      tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : []
    );

    const conn = await pool.getConnection();
    try {
      const [result] = await conn.query(
        `INSERT INTO products (sku, name, category, description, price, dimensions, thumbnail, model_3d, tags, stock)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [sku, name, category, description || '', parseFloat(price), dimensions, thumbnailPath, modelPath, tagsJson, parseInt(stock) || 0]
      );
      
      // Include optimization stats in response if available
      const response = { 
        id: result.insertId, 
        message: 'Produk berhasil ditambahkan'
      };
      
      if (req.optimizationStats) {
        response.optimization = req.optimizationStats;
      }
      
      if (req.optimizationErrors && req.optimizationErrors.length > 0) {
        response.optimizationWarnings = req.optimizationErrors;
      }
      
      res.status(201).json(response);
    } finally { conn.release(); }
  }
);

// PUT update product
router.put('/products/:id',
  adminAuth,
  upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'model_3d',  maxCount: 1 },
  ]),
  optimizeUploadedAsset,
  invalidateProductsCache,
  async (req, res) => {
    if (!validateFileSizes(req, res)) return;

    const { name, category, description, price, width, depth, height, tags, stock, is_active } = req.body;
    const conn = await pool.getConnection();
    try {
      const [existing] = await conn.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
      if (!existing.length) return res.status(404).json({ message: 'Produk tidak ditemukan' });

      const thumbnailPath = req.files?.thumbnail?.[0]?.filename
        ? fileUrl(req.files.thumbnail[0].filename, 'images')
        : existing[0].thumbnail;
      const modelPath = req.files?.model_3d?.[0]?.filename
        ? fileUrl(req.files.model_3d[0].filename, 'models')
        : existing[0].model_3d;

      const dimensions = JSON.stringify({
        width:  parseFloat(width)  || 0,
        depth:  parseFloat(depth)  || 0,
        height: parseFloat(height) || 0,
      });
      const tagsJson = JSON.stringify(
        tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : []
      );

      await conn.query(
        `UPDATE products SET name=?, category=?, description=?, price=?, dimensions=?,
         thumbnail=?, model_3d=?, tags=?, stock=?, is_active=?, updated_at=NOW()
         WHERE id=?`,
        [name, category, description, parseFloat(price), dimensions,
         thumbnailPath, modelPath, tagsJson, parseInt(stock) || 0,
         is_active === '0' ? 0 : 1, req.params.id]
      );
      
      // Check for low stock and send notification if needed
      const notificationService = req.app.get('notificationService');
      if (notificationService) {
        const newStock = parseInt(stock) || 0;
        setImmediate(async () => {
          try {
            await notificationService.checkLowStock(req.params.id, name, newStock);
          } catch (error) {
            console.error('[Products] Low stock notification error:', error);
          }
        });
      }
      
      // Include optimization stats in response if available
      const response = { message: 'Produk diperbarui' };
      
      if (req.optimizationStats) {
        response.optimization = req.optimizationStats;
      }
      
      if (req.optimizationErrors && req.optimizationErrors.length > 0) {
        response.optimizationWarnings = req.optimizationErrors;
      }
      
      res.json(response);
    } finally { conn.release(); }
  }
);

// DELETE product
router.delete('/products/:id', adminAuth, invalidateProductsCache, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ message: 'Produk dihapus' });
  } finally { conn.release(); }
});

// ─── VARIANTS ────────────────────────────────────────────────────────────────

// GET variants produk
router.get('/products/:id/variants', adminAuth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query('SELECT * FROM product_variants WHERE product_id = ?', [req.params.id]);
    res.json(rows);
  } finally { conn.release(); }
});

// POST tambah varian
router.post('/products/:id/variants',
  adminAuth,
  upload.fields([{ name: 'model_3d', maxCount: 1 }]),
  optimizeUploadedAsset,
  invalidateProductsCache,
  async (req, res) => {
    const { name, color, stock } = req.body;
    const modelPath = req.files?.model_3d?.[0]?.filename
      ? fileUrl(req.files.model_3d[0].filename, 'models') : null;

    const conn = await pool.getConnection();
    try {
      const [result] = await conn.query(
        'INSERT INTO product_variants (product_id, name, color, model_3d, stock) VALUES (?, ?, ?, ?, ?)',
        [req.params.id, name, color || null, modelPath, parseInt(stock) || 0]
      );
      res.status(201).json({ id: result.insertId });
    } finally { conn.release(); }
  }
);

// DELETE varian
router.delete('/products/:productId/variants/:variantId', adminAuth, invalidateProductsCache, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.query('DELETE FROM product_variants WHERE id = ? AND product_id = ?',
      [req.params.variantId, req.params.productId]);
    res.json({ message: 'Varian dihapus' });
  } finally { conn.release(); }
});

// ─── STATS ───────────────────────────────────────────────────────────────────
router.get('/stats', adminAuth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const [[{ totalProducts }]] = await conn.query('SELECT COUNT(*) as totalProducts FROM products');
    const [[{ totalOrders }]]   = await conn.query('SELECT COUNT(*) as totalOrders FROM orders');
    const [[{ totalUsers }]]    = await conn.query('SELECT COUNT(*) as totalUsers FROM users');
    const [[{ totalRevenue }]]  = await conn.query(
      "SELECT COALESCE(SUM(total),0) as totalRevenue FROM orders WHERE status != 'cancelled'"
    );
    const [[{ totalWallpapers }]] = await conn.query('SELECT COUNT(*) as totalWallpapers FROM wallpapers');
    res.json({ totalProducts, totalOrders, totalUsers, totalRevenue, totalWallpapers });
  } finally { conn.release(); }
});

// ─── WALLPAPERS ──────────────────────────────────────────────────────────────

// GET all wallpapers (admin — termasuk nonaktif)
router.get('/wallpapers', adminAuth, async (req, res) => {
  const { search, category, page = 1, limit = 30 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let where = [], params = [];

  if (search) { where.push('name LIKE ?'); params.push(`%${search}%`); }
  if (category && category !== 'all') { where.push('category = ?'); params.push(category); }

  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT * FROM wallpapers ${clause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    const [count] = await conn.query(`SELECT COUNT(*) as total FROM wallpapers ${clause}`, params);
    res.json({ data: rows, total: count[0].total });
  } finally { conn.release(); }
});

// GET single wallpaper (admin)
router.get('/wallpapers/:id', adminAuth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query('SELECT * FROM wallpapers WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Wallpaper tidak ditemukan' });
    res.json(rows[0]);
  } finally { conn.release(); }
});

// POST create wallpaper
router.post('/wallpapers',
  adminAuth,
  upload.fields([{ name: 'thumbnail', maxCount: 1 }]),
  optimizeUploadedAsset,
  invalidateWallpapersCache,
  async (req, res) => {
    if (!validateFileSizes(req, res)) return;

    const { name, category, price_per_meter, texture_pattern, color, description } = req.body;
    if (!name || !price_per_meter)
      return res.status(400).json({ message: 'Nama dan harga per meter wajib diisi' });

    const thumbnailPath = req.files?.thumbnail?.[0]?.filename
      ? fileUrl(req.files.thumbnail[0].filename, 'images') : null;

    const conn = await pool.getConnection();
    try {
      const [result] = await conn.query(
        `INSERT INTO wallpapers (name, category, price_per_meter, thumbnail, texture_pattern, color, description)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [name, category || 'polos', parseFloat(price_per_meter), thumbnailPath,
         texture_pattern || 'plain', color || '#FFFFFF', description || '']
      );
      
      // Include optimization stats in response if available
      const response = { 
        id: result.insertId, 
        message: 'Wallpaper berhasil ditambahkan'
      };
      
      if (req.optimizationStats) {
        response.optimization = req.optimizationStats;
      }
      
      if (req.optimizationErrors && req.optimizationErrors.length > 0) {
        response.optimizationWarnings = req.optimizationErrors;
      }
      
      res.status(201).json(response);
    } finally { conn.release(); }
  }
);

// PUT update wallpaper
router.put('/wallpapers/:id',
  adminAuth,
  upload.fields([{ name: 'thumbnail', maxCount: 1 }]),
  optimizeUploadedAsset,
  invalidateWallpapersCache,
  async (req, res) => {
    if (!validateFileSizes(req, res)) return;

    const { name, category, price_per_meter, texture_pattern, color, description, is_active } = req.body;
    const conn = await pool.getConnection();
    try {
      const [existing] = await conn.query('SELECT * FROM wallpapers WHERE id = ?', [req.params.id]);
      if (!existing.length) return res.status(404).json({ message: 'Wallpaper tidak ditemukan' });

      const thumbnailPath = req.files?.thumbnail?.[0]?.filename
        ? fileUrl(req.files.thumbnail[0].filename, 'images')
        : existing[0].thumbnail;

      await conn.query(
        `UPDATE wallpapers SET name=?, category=?, price_per_meter=?, thumbnail=?,
         texture_pattern=?, color=?, description=?, is_active=?, updated_at=NOW()
         WHERE id=?`,
        [name, category, parseFloat(price_per_meter), thumbnailPath,
         texture_pattern || 'plain', color || '#FFFFFF', description || '',
         is_active === '0' ? 0 : 1, req.params.id]
      );
      
      // Include optimization stats in response if available
      const response = { message: 'Wallpaper diperbarui' };
      
      if (req.optimizationStats) {
        response.optimization = req.optimizationStats;
      }
      
      if (req.optimizationErrors && req.optimizationErrors.length > 0) {
        response.optimizationWarnings = req.optimizationErrors;
      }
      
      res.json(response);
    } finally { conn.release(); }
  }
);

// DELETE wallpaper
router.delete('/wallpapers/:id', adminAuth, invalidateWallpapersCache, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.query('DELETE FROM wallpapers WHERE id = ?', [req.params.id]);
    res.json({ message: 'Wallpaper dihapus' });
  } finally { conn.release(); }
});

// ─── ORDERS ──────────────────────────────────────────────────────────────────

const { generateOrderCode } = require('../services/orderCodeGenerator');
const { sendOrderStatusEmail, sendPasswordResetEmail } = require('../services/emailNotification');

// GET all orders with filtering and pagination (Task 2.1, 2.2)
router.get('/orders', adminAuth, async (req, res) => {
  const { search, status, dateFrom, dateTo, page = 1, limit = 30 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let where = [], params = [];

  // Search by order_code or customer name in shipping_address
  if (search) {
    where.push('(o.order_code LIKE ? OR JSON_UNQUOTE(JSON_EXTRACT(o.shipping_address, "$.name")) LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  // Filter by status
  if (status && status !== 'all') {
    where.push('o.status = ?');
    params.push(status);
  }

  // Filter by date range
  if (dateFrom) {
    where.push('DATE(o.created_at) >= ?');
    params.push(dateFrom);
  }
  if (dateTo) {
    where.push('DATE(o.created_at) <= ?');
    params.push(dateTo);
  }

  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const conn = await pool.getConnection();
  try {
    // Get orders with customer name
    const [rows] = await conn.query(
      `SELECT o.id, o.order_code, o.status, o.total, o.created_at, o.updated_at,
              JSON_UNQUOTE(JSON_EXTRACT(o.shipping_address, '$.name')) as customer_name,
              JSON_UNQUOTE(JSON_EXTRACT(o.shipping_address, '$.email')) as customer_email
       FROM orders o
       ${clause}
       ORDER BY o.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    // Get total count
    const [count] = await conn.query(
      `SELECT COUNT(*) as total FROM orders o ${clause}`,
      params
    );

    // Get status counts for filter tabs
    const [statusCounts] = await conn.query(
      `SELECT status, COUNT(*) as count FROM orders GROUP BY status`
    );
    const counts = {
      all: count[0].total,
      pending: 0,
      paid: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };
    statusCounts.forEach(sc => {
      counts[sc.status] = sc.count;
    });

    res.json({
      data: rows,
      total: count[0].total,
      statusCounts: counts,
    });
  } finally {
    conn.release();
  }
});

// GET export orders to CSV (Task 9.1) - MUST be before /orders/:id
router.get('/orders/export', adminAuth, async (req, res) => {
  const { search, status, dateFrom, dateTo } = req.query;
  let where = [], params = [];

  // Apply same filters as order listing
  if (search) {
    where.push('(o.order_code LIKE ? OR JSON_UNQUOTE(JSON_EXTRACT(o.shipping_address, "$.name")) LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (status && status !== 'all') {
    where.push('o.status = ?');
    params.push(status);
  }
  if (dateFrom) {
    where.push('DATE(o.created_at) >= ?');
    params.push(dateFrom);
  }
  if (dateTo) {
    where.push('DATE(o.created_at) <= ?');
    params.push(dateTo);
  }

  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT o.order_code,
              JSON_UNQUOTE(JSON_EXTRACT(o.shipping_address, '$.name')) as customer_name,
              JSON_UNQUOTE(JSON_EXTRACT(o.shipping_address, '$.email')) as customer_email,
              JSON_UNQUOTE(JSON_EXTRACT(o.shipping_address, '$.phone')) as customer_phone,
              o.status, o.subtotal, o.shipping_cost, o.discount, o.total,
              o.created_at, o.updated_at
       FROM orders o
       ${clause}
       ORDER BY o.created_at DESC`,
      params
    );

    // Generate CSV with UTF-8 BOM for Excel compatibility
    const BOM = '\uFEFF';
    let csv = BOM + 'Order Code,Customer Name,Customer Email,Customer Phone,Status,Subtotal,Shipping Cost,Discount,Total,Created At,Updated At\n';
    
    rows.forEach(row => {
      const formatDate = (date) => {
        const d = new Date(date);
        return d.toLocaleString('id-ID', { 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      };

      csv += [
        `"${row.order_code}"`,
        `"${row.customer_name || ''}"`,
        `"${row.customer_email || ''}"`,
        `"${row.customer_phone || ''}"`,
        `"${row.status}"`,
        row.subtotal,
        row.shipping_cost,
        row.discount,
        row.total,
        `"${formatDate(row.created_at)}"`,
        `"${formatDate(row.updated_at)}"`,
      ].join(',') + '\n';
    });

    // Set response headers for CSV download
    const today = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="orders-export-${today}.csv"`);
    res.send(csv);
  } finally {
    conn.release();
  }
});

// GET single order with details (Task 3.1)
router.get('/orders/:id', adminAuth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    // Get order with parsed shipping_address
    const [orders] = await conn.query(
      `SELECT o.*, u.name as user_name, u.email as user_email
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.id
       WHERE o.id = ?`,
      [req.params.id]
    );

    if (!orders.length) {
      return res.status(404).json({ message: 'Pesanan tidak ditemukan' });
    }

    const order = orders[0];
    
    // Parse shipping_address JSON
    if (order.shipping_address) {
      try {
        order.shipping_address = JSON.parse(order.shipping_address);
      } catch (e) {
        order.shipping_address = {};
      }
    }

    // Get order items with product details
    const [items] = await conn.query(
      `SELECT oi.*, p.name as product_name, p.thumbnail,
              pv.name as variant_name, pv.color as variant_color
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       LEFT JOIN product_variants pv ON oi.variant_id = pv.id
       WHERE oi.order_id = ?`,
      [req.params.id]
    );
    order.items = items;

    // Get status history with admin user info
    const [history] = await conn.query(
      `SELECT sh.*, u.name as changed_by_name
       FROM status_history sh
       LEFT JOIN users u ON sh.changed_by = u.id
       WHERE sh.order_id = ?
       ORDER BY sh.created_at DESC`,
      [req.params.id]
    );
    order.status_history = history;

    res.json(order);
  } finally {
    conn.release();
  }
});

// POST create new order (Task 4.1)
router.post('/orders', adminAuth, async (req, res) => {
  const {
    user_id,
    items,
    shipping_address,
    shipping_cost = 0,
    discount = 0,
    notes = '',
  } = req.body;

  // Validation
  if (!user_id) {
    return res.status(400).json({ message: 'User ID wajib diisi' });
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Minimal satu item harus ditambahkan' });
  }
  if (!shipping_address || !shipping_address.name || !shipping_address.email || 
      !shipping_address.phone || !shipping_address.address) {
    return res.status(400).json({ message: 'Alamat pengiriman tidak lengkap' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(shipping_address.email)) {
    return res.status(400).json({ message: 'Format email tidak valid' });
  }

  // Validate phone format (digits, spaces, hyphens, plus signs)
  const phoneRegex = /^[\d\s\-+]+$/;
  if (!phoneRegex.test(shipping_address.phone)) {
    return res.status(400).json({ message: 'Format nomor telepon tidak valid' });
  }

  // Validate items
  for (const item of items) {
    if (!item.product_id || !item.quantity || !item.price) {
      return res.status(400).json({ message: 'Data item tidak lengkap' });
    }
    if (item.quantity <= 0 || !Number.isInteger(item.quantity)) {
      return res.status(400).json({ message: 'Jumlah item harus bilangan bulat positif' });
    }
    if (item.price < 0) {
      return res.status(400).json({ message: 'Harga tidak boleh negatif' });
    }
  }

  // Validate shipping_cost and discount
  if (shipping_cost < 0 || discount < 0) {
    return res.status(400).json({ message: 'Ongkir dan diskon tidak boleh negatif' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Generate order code
    const order_code = await generateOrderCode();

    // Calculate subtotal
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = subtotal + parseFloat(shipping_cost) - parseFloat(discount);

    // Insert order
    const [orderResult] = await conn.query(
      `INSERT INTO orders (user_id, order_code, status, subtotal, shipping_cost, discount, total, shipping_address, notes, created_at, updated_at)
       VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [user_id, order_code, subtotal, shipping_cost, discount, total, JSON.stringify(shipping_address), notes]
    );

    const orderId = orderResult.insertId;

    // Insert order items
    for (const item of items) {
      await conn.query(
        `INSERT INTO order_items (order_id, product_id, variant_id, quantity, price)
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, item.product_id, item.variant_id || null, item.quantity, item.price]
      );
    }

    await conn.commit();

    res.status(201).json({
      id: orderId,
      order_code,
      message: 'Pesanan berhasil dibuat',
    });
  } catch (error) {
    await conn.rollback();
    console.error('[Orders] Create error:', error);
    res.status(500).json({ message: 'Gagal membuat pesanan' });
  } finally {
    conn.release();
  }
});

// PUT update order status (Task 7.1)
router.put('/orders/:id/status', adminAuth, async (req, res) => {
  const { status: newStatus } = req.body;

  if (!newStatus) {
    return res.status(400).json({ message: 'Status baru wajib diisi' });
  }

  const conn = await pool.getConnection();
  try {
    // Get current order
    const [orders] = await conn.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!orders.length) {
      return res.status(404).json({ message: 'Pesanan tidak ditemukan' });
    }

    const order = orders[0];
    const oldStatus = order.status;

    // Validate status transition
    const validTransitions = {
      pending: ['paid', 'cancelled'],
      paid: ['processing', 'cancelled'],
      processing: ['shipped', 'cancelled'],
      shipped: ['delivered', 'cancelled'],
      delivered: [],
      cancelled: [],
    };

    if (!validTransitions[oldStatus].includes(newStatus)) {
      return res.status(400).json({ 
        message: `Transisi status dari ${oldStatus} ke ${newStatus} tidak diperbolehkan` 
      });
    }

    await conn.beginTransaction();

    // Update order status
    await conn.query(
      'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
      [newStatus, req.params.id]
    );

    // Insert status history
    await conn.query(
      `INSERT INTO status_history (order_id, old_status, new_status, changed_by, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [req.params.id, oldStatus, newStatus, req.user.id]
    );

    await conn.commit();

    // Send notifications asynchronously (don't block response)
    setImmediate(async () => {
      try {
        const notificationService = req.app.get('notificationService');
        
        // Get full order details for email and notifications
        const conn2 = await pool.getConnection();
        try {
          const [orderDetails] = await conn2.query(
            `SELECT o.*, 
                    JSON_UNQUOTE(JSON_EXTRACT(o.shipping_address, '$.name')) as customer_name,
                    JSON_UNQUOTE(JSON_EXTRACT(o.shipping_address, '$.email')) as customer_email
             FROM orders o WHERE o.id = ?`,
            [req.params.id]
          );

          if (orderDetails.length > 0) {
            const orderData = orderDetails[0];
            
            // Parse shipping_address
            if (orderData.shipping_address) {
              try {
                orderData.shipping_address = JSON.parse(orderData.shipping_address);
              } catch (e) {
                orderData.shipping_address = {};
              }
            }

            // Get order items
            const [items] = await conn2.query(
              `SELECT oi.*, p.name as product_name, pv.name as variant_name
               FROM order_items oi
               LEFT JOIN products p ON oi.product_id = p.id
               LEFT JOIN product_variants pv ON oi.variant_id = pv.id
               WHERE oi.order_id = ?`,
              [req.params.id]
            );
            orderData.items = items;

            // Send email notification
            await sendOrderStatusEmail(orderData, newStatus);

            // Send admin notification for order status change
            if (notificationService) {
              const statusMessage = `Order #${order.order_code} status changed from ${oldStatus} to ${newStatus}`;
              await notificationService.createNotification(
                'order_status',
                statusMessage,
                'order',
                req.params.id,
                { order_code: order.order_code, old_status: oldStatus, new_status: newStatus }
              );

              // Send payment confirmation notification if status changed to 'paid'
              if (oldStatus === 'pending' && newStatus === 'paid') {
                const paymentMessage = `Payment confirmed for order #${order.order_code} - Rp ${order.total.toLocaleString('id-ID')} via Bank Transfer`;
                await notificationService.createNotification(
                  'payment_confirmed',
                  paymentMessage,
                  'order',
                  req.params.id,
                  { order_code: order.order_code, amount: order.total, payment_method: 'Bank Transfer' }
                );
              }
            }
          }
        } finally {
          conn2.release();
        }
      } catch (emailError) {
        console.error('[Orders] Email/notification error:', emailError);
      }
    });

    res.json({ 
      message: 'Status pesanan berhasil diperbarui',
      oldStatus,
      newStatus,
    });
  } catch (error) {
    await conn.rollback();
    console.error('[Orders] Status update error:', error);
    res.status(500).json({ message: 'Gagal memperbarui status pesanan' });
  } finally {
    conn.release();
  }
});

// PUT update order (Task 5.1)
router.put('/orders/:id', adminAuth, async (req, res) => {
  const {
    items,
    shipping_address,
    shipping_cost = 0,
    discount = 0,
    notes = '',
  } = req.body;

  const conn = await pool.getConnection();
  try {
    // Check if order exists and is pending
    const [orders] = await conn.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!orders.length) {
      return res.status(404).json({ message: 'Pesanan tidak ditemukan' });
    }

    const order = orders[0];
    if (order.status !== 'pending') {
      return res.status(400).json({ message: 'Hanya pesanan dengan status pending yang dapat diedit' });
    }

    // Validation (same as create)
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Minimal satu item harus ditambahkan' });
    }
    if (!shipping_address || !shipping_address.name || !shipping_address.email || 
        !shipping_address.phone || !shipping_address.address) {
      return res.status(400).json({ message: 'Alamat pengiriman tidak lengkap' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(shipping_address.email)) {
      return res.status(400).json({ message: 'Format email tidak valid' });
    }

    const phoneRegex = /^[\d\s\-+]+$/;
    if (!phoneRegex.test(shipping_address.phone)) {
      return res.status(400).json({ message: 'Format nomor telepon tidak valid' });
    }

    for (const item of items) {
      if (!item.product_id || !item.quantity || !item.price) {
        return res.status(400).json({ message: 'Data item tidak lengkap' });
      }
      if (item.quantity <= 0 || !Number.isInteger(item.quantity)) {
        return res.status(400).json({ message: 'Jumlah item harus bilangan bulat positif' });
      }
      if (item.price < 0) {
        return res.status(400).json({ message: 'Harga tidak boleh negatif' });
      }
    }

    if (shipping_cost < 0 || discount < 0) {
      return res.status(400).json({ message: 'Ongkir dan diskon tidak boleh negatif' });
    }

    await conn.beginTransaction();

    // Calculate new subtotal and total
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = subtotal + parseFloat(shipping_cost) - parseFloat(discount);

    // Update order
    await conn.query(
      `UPDATE orders SET subtotal = ?, shipping_cost = ?, discount = ?, total = ?, 
       shipping_address = ?, notes = ?, updated_at = NOW()
       WHERE id = ?`,
      [subtotal, shipping_cost, discount, total, JSON.stringify(shipping_address), notes, req.params.id]
    );

    // Delete existing order items
    await conn.query('DELETE FROM order_items WHERE order_id = ?', [req.params.id]);

    // Insert new order items
    for (const item of items) {
      await conn.query(
        `INSERT INTO order_items (order_id, product_id, variant_id, quantity, price)
         VALUES (?, ?, ?, ?, ?)`,
        [req.params.id, item.product_id, item.variant_id || null, item.quantity, item.price]
      );
    }

    await conn.commit();

    res.json({ message: 'Pesanan berhasil diperbarui' });
  } catch (error) {
    await conn.rollback();
    console.error('[Orders] Update error:', error);
    res.status(500).json({ message: 'Gagal memperbarui pesanan' });
  } finally {
    conn.release();
  }
});

// DELETE order (Task 10.1)
router.delete('/orders/:id', adminAuth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    // Check if order exists
    const [orders] = await conn.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!orders.length) {
      return res.status(404).json({ message: 'Pesanan tidak ditemukan' });
    }

    await conn.beginTransaction();

    // Delete order items (will cascade, but explicit for clarity)
    await conn.query('DELETE FROM order_items WHERE order_id = ?', [req.params.id]);

    // Delete status history (will cascade, but explicit for clarity)
    await conn.query('DELETE FROM status_history WHERE order_id = ?', [req.params.id]);

    // Delete order
    await conn.query('DELETE FROM orders WHERE id = ?', [req.params.id]);

    await conn.commit();

    res.json({ message: 'Pesanan berhasil dihapus' });
  } catch (error) {
    await conn.rollback();
    console.error('[Orders] Delete error:', error);
    res.status(500).json({ message: 'Gagal menghapus pesanan' });
  } finally {
    conn.release();
  }
});

// ─── USERS ───────────────────────────────────────────────────────────────────

// PUT update user status (block/unblock) (Task 4.1)
router.put('/users/:id/status', adminAuth, async (req, res) => {
  const { status } = req.body;

  // Validate status value
  if (!status || (status !== 'active' && status !== 'blocked')) {
    return res.status(400).json({ 
      message: 'Status harus berupa "active" atau "blocked"' 
    });
  }

  // Prevent self-modification
  if (req.user.id === parseInt(req.params.id)) {
    return res.status(400).json({ 
      message: 'Cannot block your own account' 
    });
  }

  const conn = await pool.getConnection();
  try {
    // Check if user exists
    const [users] = await conn.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!users.length) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    const user = users[0];
    const oldStatus = user.status;

    // Update user status and updated_at timestamp
    await conn.query(
      'UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, req.params.id]
    );

    // Log administrative action for audit
    const action = status === 'blocked' ? 'blocked' : 'unblocked';
    console.log(`[Admin ${req.user.id}] ${action} user ${req.params.id} (${user.email}) at ${new Date().toISOString()}`);

    res.json({ 
      message: `Status user berhasil diperbarui menjadi ${status}`,
      oldStatus,
      newStatus: status,
    });
  } catch (error) {
    console.error('[Users] Status update error:', error);
    res.status(500).json({ message: 'Gagal memperbarui status user' });
  } finally {
    conn.release();
  }
});

// ─── USERS ───────────────────────────────────────────────────────────────────

// POST reset user password (Task 6.1)
router.post('/users/:id/reset-password', adminAuth, async (req, res) => {
  // Prevent self-modification
  if (req.user.id === parseInt(req.params.id)) {
    return res.status(400).json({ 
      message: 'Cannot reset your own password through this interface' 
    });
  }

  const conn = await pool.getConnection();
  try {
    // Check if user exists
    const [users] = await conn.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!users.length) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    const user = users[0];

    // Generate secure random password
    const crypto = require('crypto');
    const bcrypt = require('bcryptjs');
    
    // Generate password with required complexity:
    // - Minimum 12 characters
    // - At least 1 uppercase, 1 lowercase, 1 number, 1 special character
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    // Ensure at least one character from each category
    let tempPassword = '';
    tempPassword += uppercase[crypto.randomInt(0, uppercase.length)];
    tempPassword += lowercase[crypto.randomInt(0, lowercase.length)];
    tempPassword += numbers[crypto.randomInt(0, numbers.length)];
    tempPassword += special[crypto.randomInt(0, special.length)];
    
    // Fill remaining characters (minimum 12 total)
    const allChars = uppercase + lowercase + numbers + special;
    for (let i = tempPassword.length; i < 12; i++) {
      tempPassword += allChars[crypto.randomInt(0, allChars.length)];
    }
    
    // Shuffle the password to randomize character positions
    tempPassword = tempPassword.split('').sort(() => crypto.randomInt(0, 2) - 0.5).join('');

    // Hash password with bcrypt cost factor 10
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Update user password and updated_at timestamp
    await conn.query(
      'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
      [hashedPassword, req.params.id]
    );

    // Log administrative action for audit
    console.log(`[Admin ${req.user.id}] reset password for user ${req.params.id} (${user.email}) at ${new Date().toISOString()}`);

    // Send email to user with temporary password (async, non-blocking)
    setImmediate(async () => {
      try {
        await sendPasswordResetEmail(user.email, user.name, tempPassword);
      } catch (emailError) {
        console.error('[Users] Password reset email error:', emailError);
      }
    });

    // Return temporary password in response
    res.json({ 
      message: 'Password berhasil direset',
      temporary_password: tempPassword,
    });
  } catch (error) {
    console.error('[Users] Password reset error:', error);
    res.status(500).json({ message: 'Gagal mereset password' });
  } finally {
    conn.release();
  }
});

// PUT update user role (Task 7.1)
router.put('/users/:id/role', adminAuth, async (req, res) => {
  const { role } = req.body;

  // Validate role value
  if (!role || (role !== 'user' && role !== 'admin')) {
    return res.status(400).json({ 
      message: 'Role harus berupa "user" atau "admin"' 
    });
  }

  // Prevent self-modification
  if (req.user.id === parseInt(req.params.id)) {
    return res.status(400).json({ 
      message: 'Cannot change your own role' 
    });
  }

  const conn = await pool.getConnection();
  try {
    // Check if user exists
    const [users] = await conn.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!users.length) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    const user = users[0];
    const oldRole = user.role;

    // Update user role and updated_at timestamp
    await conn.query(
      'UPDATE users SET role = ?, updated_at = NOW() WHERE id = ?',
      [role, req.params.id]
    );

    // Log administrative action for audit
    console.log(`[Admin ${req.user.id}] changed role for user ${req.params.id} (${user.email}) from ${oldRole} to ${role} at ${new Date().toISOString()}`);

    res.json({ 
      message: `Role user berhasil diperbarui menjadi ${role}`,
      oldRole,
      newRole: role,
    });
  } catch (error) {
    console.error('[Users] Role update error:', error);
    res.status(500).json({ message: 'Gagal memperbarui role user' });
  } finally {
    conn.release();
  }
});

// GET all users with filtering and pagination (Task 2.1)
router.get('/users', adminAuth, async (req, res) => {
  const { search, role, status, page = 1, limit = 30 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let where = [], params = [];

  // Search by name OR email (case-insensitive)
  if (search) {
    where.push('(name LIKE ? OR email LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  // Filter by role
  if (role && role !== 'all') {
    where.push('role = ?');
    params.push(role);
  }

  // Filter by status
  if (status && status !== 'all') {
    where.push('status = ?');
    params.push(status);
  }

  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const conn = await pool.getConnection();
  try {
    // Get users with pagination (exclude password field)
    const [rows] = await conn.query(
      `SELECT id, name, email, avatar, role, status, created_at, updated_at
       FROM users
       ${clause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    // Get total count
    const [count] = await conn.query(
      `SELECT COUNT(*) as total FROM users ${clause}`,
      params
    );

    // Get status counts for filter badges
    const [statusCountsResult] = await conn.query(
      `SELECT status, COUNT(*) as count FROM users GROUP BY status`
    );
    const statusCounts = {
      all: count[0].total,
      active: 0,
      blocked: 0,
    };
    statusCountsResult.forEach(sc => {
      statusCounts[sc.status] = sc.count;
    });

    // Get role counts for filter badges
    const [roleCountsResult] = await conn.query(
      `SELECT role, COUNT(*) as count FROM users GROUP BY role`
    );
    const roleCounts = {
      user: 0,
      admin: 0,
    };
    roleCountsResult.forEach(rc => {
      roleCounts[rc.role] = rc.count;
    });

    res.json({
      data: rows,
      total: count[0].total,
      statusCounts,
      roleCounts,
    });
  } finally {
    conn.release();
  }
});

// GET export users to CSV (Task 9.1) - MUST be before /users/:id
router.get('/users/export', adminAuth, async (req, res) => {
  const { search, role, status } = req.query;
  let where = [], params = [];

  // Apply same filters as user listing
  if (search) {
    where.push('(u.name LIKE ? OR u.email LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (role && role !== 'all') {
    where.push('u.role = ?');
    params.push(role);
  }
  if (status && status !== 'all') {
    where.push('u.status = ?');
    params.push(status);
  }

  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const conn = await pool.getConnection();
  try {
    // Query all matching users with order analytics (no pagination)
    const [rows] = await conn.query(
      `SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.status,
        u.created_at,
        u.updated_at,
        COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.total ELSE 0 END), 0) as total_spent,
        COUNT(o.id) as order_count
       FROM users u
       LEFT JOIN orders o ON u.id = o.user_id
       ${clause}
       GROUP BY u.id
       ORDER BY u.created_at DESC`,
      params
    );

    // Generate CSV with UTF-8 BOM for Excel compatibility
    const BOM = '\uFEFF';
    let csv = BOM + 'ID,Name,Email,Role,Status,Created At,Updated At,Total Spent,Order Count\n';
    
    rows.forEach(row => {
      const formatDate = (date) => {
        const d = new Date(date);
        return d.toLocaleString('id-ID', { 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
      };

      // Quote text fields to handle commas in names/emails
      csv += [
        row.id,
        `"${row.name || ''}"`,
        `"${row.email || ''}"`,
        `"${row.role}"`,
        `"${row.status}"`,
        `"${formatDate(row.created_at)}"`,
        `"${formatDate(row.updated_at)}"`,
        row.total_spent,
        row.order_count,
      ].join(',') + '\n';
    });

    // Set response headers for CSV download
    const today = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="users-export-${today}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('[Users] Export error:', error);
    res.status(500).json({ message: 'Gagal mengekspor data user' });
  } finally {
    conn.release();
  }
});

// DELETE user account (Task 8.1)
router.delete('/users/:id', adminAuth, async (req, res) => {
  // Prevent self-modification
  if (req.user.id === parseInt(req.params.id)) {
    return res.status(400).json({ 
      message: 'Cannot delete your own account' 
    });
  }

  const conn = await pool.getConnection();
  try {
    // Check if user exists
    const [users] = await conn.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!users.length) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    const user = users[0];

    // Delete user record from users table
    // Orders will remain in database with user_id reference intact (no CASCADE delete)
    await conn.query('DELETE FROM users WHERE id = ?', [req.params.id]);

    // Log administrative action for audit
    console.log(`[Admin ${req.user.id}] deleted user ${req.params.id} (${user.email}) at ${new Date().toISOString()}`);

    res.json({ 
      message: 'User berhasil dihapus',
    });
  } catch (error) {
    console.error('[Users] Delete error:', error);
    res.status(500).json({ message: 'Gagal menghapus user' });
  } finally {
    conn.release();
  }
});

// GET single user detail with analytics and order history (Task 3.1)
router.get('/users/:id', adminAuth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    // Get user profile (exclude password field)
    const [users] = await conn.query(
      `SELECT id, name, email, avatar, role, status, created_at, updated_at
       FROM users
       WHERE id = ?`,
      [req.params.id]
    );

    if (!users.length) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    const user = users[0];

    // Calculate analytics
    // - total_spent: sum of order totals where status = 'delivered'
    // - order_count: count of all orders
    // - last_order_date: most recent order date
    const [analyticsResult] = await conn.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN status = 'delivered' THEN total ELSE 0 END), 0) as total_spent,
        COUNT(id) as order_count,
        MAX(created_at) as last_order_date
       FROM orders
       WHERE user_id = ?`,
      [req.params.id]
    );

    const analytics = analyticsResult[0];
    
    // Calculate average_order_value (handle division by zero)
    analytics.average_order_value = analytics.order_count > 0 
      ? analytics.total_spent / analytics.order_count 
      : 0;

    // Fetch 10 most recent orders sorted by created_at DESC
    const [recentOrders] = await conn.query(
      `SELECT id, order_code, status, total, created_at
       FROM orders
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 10`,
      [req.params.id]
    );

    // Return complete user profile with analytics and orders
    res.json({
      ...user,
      analytics: {
        total_spent: analytics.total_spent,
        order_count: analytics.order_count,
        last_order_date: analytics.last_order_date,
        average_order_value: analytics.average_order_value,
      },
      recent_orders: recentOrders,
    });
  } catch (error) {
    console.error('[Users] Get user detail error:', error);
    res.status(500).json({ message: 'Gagal mengambil detail user' });
  } finally {
    conn.release();
  }
});

// ─── SETTINGS ────────────────────────────────────────────────────────────────

// GET all settings
router.get('/settings', adminAuth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query('SELECT * FROM settings');
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    res.json(settings);
  } finally { conn.release(); }
});

// PUT update setting
router.put('/settings', adminAuth, async (req, res) => {
  const { key, value } = req.body;
  if (!key) return res.status(400).json({ message: 'Key wajib diisi' });

  const conn = await pool.getConnection();
  try {
    await conn.query(
      'INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?',
      [key, value, value]
    );
    res.json({ message: 'Setting berhasil disimpan' });
  } finally { conn.release(); }
});

module.exports = router;
