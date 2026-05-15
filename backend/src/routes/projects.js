const router = require('express').Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const APICacheManager = require('../cache/CacheManager');
const queryOptimizer = require('../database/QueryOptimizer');
const { v4: uuidv4 } = require('uuid');

// Initialize cache manager with appropriate TTL
const cacheManager = new APICacheManager({
  defaultTTL: 180000, // 3 minutes default
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
const invalidateProjectsCache = (req, res, next) => {
  // Invalidate all projects-related cache entries
  cacheManager.invalidate(/GET:\/projects/);
  next();
};

// GET all projects milik user atau guest
router.get('/', optionalAuth, cacheMiddleware(180000), async (req, res) => { // 3 minutes cache
  try {
    let query;
    let params;

    if (req.user) {
      // Authenticated user - get their projects
      query = `SELECT 
         p.id,
         p.user_id,
         p.name,
         p.room_type,
         p.room_config,
         p.thumbnail,
         p.created_at,
         p.updated_at,
         COUNT(pi.id) as item_count
       FROM projects p
       LEFT JOIN project_items pi ON pi.project_id = p.id
       WHERE p.user_id = ?
       GROUP BY p.id, p.user_id, p.name, p.room_type, p.room_config, p.thumbnail, p.created_at, p.updated_at
       ORDER BY p.updated_at DESC`;
      params = [req.user.id];
    } else if (req.guestToken) {
      // Guest user - get their projects
      query = `SELECT 
         p.id,
         p.guest_token,
         p.name,
         p.room_type,
         p.room_config,
         p.thumbnail,
         p.created_at,
         p.updated_at,
         COUNT(pi.id) as item_count
       FROM projects p
       LEFT JOIN project_items pi ON pi.project_id = p.id
       WHERE p.guest_token = ? AND p.user_id IS NULL
       GROUP BY p.id, p.guest_token, p.name, p.room_type, p.room_config, p.thumbnail, p.created_at, p.updated_at
       ORDER BY p.updated_at DESC`;
      params = [req.guestToken];
    } else {
      // No authentication - return empty array
      return res.json([]);
    }

    const rows = await queryOptimizer.execute(query, params);
    
    // Parse room_config JSON for each project
    const projects = rows.map(r => ({
      ...r,
      room_config: JSON.parse(r.room_config || '{}'),
      item_count: parseInt(r.item_count) || 0,
    }));
    
    res.json(projects);
  } catch (error) {
    console.error('[Projects API Error]', error);
    res.status(500).json({ message: 'Gagal mengambil data proyek' });
  }
});

// GET single project
router.get('/:id', optionalAuth, cacheMiddleware(180000), async (req, res) => { // 3 minutes cache
  try {
    let query;
    let params;

    if (req.user) {
      // Authenticated user
      query = 'SELECT * FROM projects WHERE id = ? AND user_id = ?';
      params = [req.params.id, req.user.id];
    } else if (req.guestToken) {
      // Guest user
      query = 'SELECT * FROM projects WHERE id = ? AND guest_token = ? AND user_id IS NULL';
      params = [req.params.id, req.guestToken];
    } else {
      return res.status(403).json({ message: 'Akses ditolak' });
    }

    const projects = await queryOptimizer.execute(query, params);
    
    if (projects.length === 0) {
      return res.status(404).json({ message: 'Proyek tidak ditemukan' });
    }

    const project = projects[0];
    const roomConfig = JSON.parse(project.room_config || '{}');

    // Items sudah lengkap tersimpan di room_config.items (termasuk elevation, model3d, dll)
    // Fallback ke project_items JOIN untuk proyek lama yang belum punya data lengkap
    const savedItems = roomConfig.items;
    let items = savedItems ?? [];

    if (!savedItems) {
      // Optimized query using indexes (idx_project_items_project_id, idx_variants_product_id)
      // Single query with JOINs to fetch all project items with product and variant details
      // Avoids N+1 query problem by fetching everything in one query
      const rows = await queryOptimizer.execute(
        `SELECT 
           pi.id,
           pi.project_id,
           pi.product_id,
           pi.variant_id,
           pi.position,
           pi.rotation,
           pi.scale,
           pi.created_at,
           p.name,
           p.thumbnail,
           p.model_3d,
           p.price,
           p.category,
           p.dimensions,
           pv.name as variant_name,
           pv.color as variant_color,
           pv.model_3d as variant_model_3d
         FROM project_items pi
         JOIN products p ON p.id = pi.product_id
         LEFT JOIN product_variants pv ON pv.id = pi.variant_id
         WHERE pi.project_id = ?
         ORDER BY pi.created_at ASC`,
        [req.params.id]
      );
      
      // Parse JSON fields for each item
      items = rows.map(i => ({
        ...i,
        position: JSON.parse(i.position || '{}'),
        dimensions: JSON.parse(i.dimensions || '{}'),
        rotation: parseFloat(i.rotation) || 0,
        scale: parseFloat(i.scale) || 1,
        elevation: 0,
      }));
    }

    res.json({
      ...project,
      room_config: { ...roomConfig, items: undefined },
      items,
    });
  } catch (error) {
    console.error('[Projects API Error]', error);
    res.status(500).json({ message: 'Gagal mengambil data proyek' });
  }
});

// POST create project
router.post('/', optionalAuth, invalidateProjectsCache, async (req, res) => {
  const { name, room_type, room_config } = req.body;
  if (!name || !room_type) return res.status(400).json({ message: 'Nama dan tipe ruangan wajib diisi' });

  try {
    let userId = null;
    let guestToken = null;

    if (req.user) {
      // Authenticated user
      userId = req.user.id;
    } else {
      // Guest user - generate or use existing guest token
      guestToken = req.guestToken || uuidv4();
    }

    // Use QueryOptimizer for prepared statements and performance monitoring
    const result = await queryOptimizer.execute(
      'INSERT INTO projects (user_id, guest_token, name, room_type, room_config) VALUES (?, ?, ?, ?, ?)',
      [userId, guestToken, name, room_type, JSON.stringify(room_config || {})]
    );
    
    res.status(201).json({ 
      id: result.insertId, 
      name, 
      room_type, 
      room_config,
      guest_token: guestToken // Return guest token for frontend storage
    });
  } catch (error) {
    console.error('[Projects API Error]', error);
    res.status(500).json({ message: 'Gagal membuat proyek' });
  }
});

// PUT update project
router.put('/:id', optionalAuth, invalidateProjectsCache, async (req, res) => {
  const { name, room_config, thumbnail } = req.body;
  
  try {
    let query;
    let params;

    if (req.user) {
      // Authenticated user
      query = `UPDATE projects 
               SET name = COALESCE(?, name), 
                   room_config = COALESCE(?, room_config), 
                   thumbnail = COALESCE(?, thumbnail), 
                   updated_at = NOW() 
               WHERE id = ? AND user_id = ?`;
      params = [
        name || null, 
        room_config ? JSON.stringify(room_config) : null, 
        thumbnail || null, 
        req.params.id, 
        req.user.id
      ];
    } else if (req.guestToken) {
      // Guest user
      query = `UPDATE projects 
               SET name = COALESCE(?, name), 
                   room_config = COALESCE(?, room_config), 
                   thumbnail = COALESCE(?, thumbnail), 
                   updated_at = NOW() 
               WHERE id = ? AND guest_token = ? AND user_id IS NULL`;
      params = [
        name || null, 
        room_config ? JSON.stringify(room_config) : null, 
        thumbnail || null, 
        req.params.id, 
        req.guestToken
      ];
    } else {
      return res.status(403).json({ message: 'Akses ditolak' });
    }

    // Use QueryOptimizer for prepared statements and performance monitoring
    await queryOptimizer.execute(query, params);
    
    res.json({ message: 'Proyek diperbarui' });
  } catch (error) {
    console.error('[Projects API Error]', error);
    res.status(500).json({ message: 'Gagal memperbarui proyek' });
  }
});

// DELETE project
router.delete('/:id', optionalAuth, invalidateProjectsCache, async (req, res) => {
  try {
    let query;
    let params;

    if (req.user) {
      // Authenticated user
      query = 'DELETE FROM projects WHERE id = ? AND user_id = ?';
      params = [req.params.id, req.user.id];
    } else if (req.guestToken) {
      // Guest user
      query = 'DELETE FROM projects WHERE id = ? AND guest_token = ? AND user_id IS NULL';
      params = [req.params.id, req.guestToken];
    } else {
      return res.status(403).json({ message: 'Akses ditolak' });
    }

    // Use QueryOptimizer for prepared statements and performance monitoring
    await queryOptimizer.execute(query, params);
    
    res.json({ message: 'Proyek dihapus' });
  } catch (error) {
    console.error('[Projects API Error]', error);
    res.status(500).json({ message: 'Gagal menghapus proyek' });
  }
});

// POST add item ke project
router.post('/:id/items', optionalAuth, invalidateProjectsCache, async (req, res) => {
  const { product_id, variant_id, position, rotation, scale } = req.body;
  
  // Validate required fields
  if (!product_id) {
    return res.status(400).json({ message: 'product_id wajib diisi' });
  }
  
  try {
    // Optimized: Use transaction to ensure atomicity
    // Both INSERT and UPDATE happen together or not at all
    const connection = await queryOptimizer.pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Insert project item using prepared statement
      const [result] = await connection.execute(
        'INSERT INTO project_items (project_id, product_id, variant_id, position, rotation, scale) VALUES (?, ?, ?, ?, ?, ?)',
        [req.params.id, product_id, variant_id || null, JSON.stringify(position || {}), rotation || 0, scale || 1]
      );
      
      // Update project timestamp with ownership check
      if (req.user) {
        await connection.execute(
          'UPDATE projects SET updated_at = NOW() WHERE id = ? AND user_id = ?',
          [req.params.id, req.user.id]
        );
      } else if (req.guestToken) {
        await connection.execute(
          'UPDATE projects SET updated_at = NOW() WHERE id = ? AND guest_token = ? AND user_id IS NULL',
          [req.params.id, req.guestToken]
        );
      } else {
        await connection.rollback();
        connection.release();
        return res.status(403).json({ message: 'Akses ditolak' });
      }
      
      await connection.commit();
      
      res.status(201).json({ id: result.insertId });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('[Projects API Error]', error);
    res.status(500).json({ message: 'Gagal menambahkan item' });
  }
});

// PUT update item position/rotation
router.put('/:id/items/:itemId', optionalAuth, invalidateProjectsCache, async (req, res) => {
  const { position, rotation, scale, variant_id } = req.body;
  
  try {
    // Optimized: Use transaction to ensure atomicity
    // Both UPDATE operations happen together or not at all
    const connection = await queryOptimizer.pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Update project item using prepared statement
      // Only update fields that are provided (COALESCE pattern)
      await connection.execute(
        `UPDATE project_items 
         SET position = COALESCE(?, position), 
             rotation = COALESCE(?, rotation), 
             scale = COALESCE(?, scale), 
             variant_id = COALESCE(?, variant_id)
         WHERE id = ? AND project_id = ?`,
        [
          position ? JSON.stringify(position) : null, 
          rotation, 
          scale, 
          variant_id, 
          req.params.itemId, 
          req.params.id
        ]
      );
      
      // Update project timestamp with ownership check
      if (req.user) {
        await connection.execute(
          'UPDATE projects SET updated_at = NOW() WHERE id = ? AND user_id = ?',
          [req.params.id, req.user.id]
        );
      } else if (req.guestToken) {
        await connection.execute(
          'UPDATE projects SET updated_at = NOW() WHERE id = ? AND guest_token = ? AND user_id IS NULL',
          [req.params.id, req.guestToken]
        );
      } else {
        await connection.rollback();
        connection.release();
        return res.status(403).json({ message: 'Akses ditolak' });
      }
      
      await connection.commit();
      
      res.json({ message: 'Item diperbarui' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('[Projects API Error]', error);
    res.status(500).json({ message: 'Gagal memperbarui item' });
  }
});

// DELETE item dari project
router.delete('/:id/items/:itemId', optionalAuth, invalidateProjectsCache, async (req, res) => {
  try {
    // Optimized: Use transaction to ensure atomicity
    // Both DELETE and UPDATE happen together or not at all
    const connection = await queryOptimizer.pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Delete project item using prepared statement
      // Includes project_id check to ensure item belongs to this project
      await connection.execute(
        'DELETE FROM project_items WHERE id = ? AND project_id = ?',
        [req.params.itemId, req.params.id]
      );
      
      // Update project timestamp with ownership check
      if (req.user) {
        await connection.execute(
          'UPDATE projects SET updated_at = NOW() WHERE id = ? AND user_id = ?',
          [req.params.id, req.user.id]
        );
      } else if (req.guestToken) {
        await connection.execute(
          'UPDATE projects SET updated_at = NOW() WHERE id = ? AND guest_token = ? AND user_id IS NULL',
          [req.params.id, req.guestToken]
        );
      } else {
        await connection.rollback();
        connection.release();
        return res.status(403).json({ message: 'Akses ditolak' });
      }
      
      await connection.commit();
      
      res.json({ message: 'Item dihapus' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('[Projects API Error]', error);
    res.status(500).json({ message: 'Gagal menghapus item' });
  }
});

module.exports = router;
