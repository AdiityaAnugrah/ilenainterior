const router = require('express').Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const queryOptimizer = require('../database/QueryOptimizer');
const { v4: uuidv4 } = require('uuid');
const { projectRevision } = require('../services/projectRevision');

function parseJsonValue(value, fallback) {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

// GET all projects milik user atau guest
router.get('/', optionalAuth, async (req, res) => { // 3 minutes cache
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
    const legacyItemsByProject = new Map(rows.map((row) => [String(row.id), []]));
    const projectIds = rows.map((row) => row.id);
    for (let offset = 0; offset < projectIds.length; offset += 500) {
      const batch = projectIds.slice(offset, offset + 500);
      const placeholders = batch.map(() => '?').join(', ');
      const legacyItems = await queryOptimizer.execute(
        'SELECT project_id, id, product_id, variant_id, position, rotation, scale FROM project_items WHERE project_id IN (' + placeholders + ') ORDER BY project_id, id',
        batch
      );
      for (const item of legacyItems) legacyItemsByProject.get(String(item.project_id))?.push(item);
    }

    const projects = rows.map((r) => {
      const roomConfig = parseJsonValue(r.room_config, {});
      return {
        ...r,
        revision: projectRevision(r, legacyItemsByProject.get(String(r.id))),
        room_config: roomConfig,
        item_count: Array.isArray(roomConfig.items) ? roomConfig.items.length : parseInt(r.item_count, 10) || 0,
      };
    });
    
    res.json(projects);
  } catch (error) {
    console.error('[Projects API Error]', error);
    res.status(500).json({ message: 'Gagal mengambil data proyek' });
  }
});

// GET single project
router.get('/:id', optionalAuth, async (req, res) => { // 3 minutes cache
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
    const roomConfig = parseJsonValue(project.room_config, {});

    // Items sudah lengkap tersimpan di room_config.items (termasuk elevation, model3d, dll)
    // Fallback ke project_items JOIN untuk proyek lama yang belum punya data lengkap
    const savedItems = roomConfig.items;
    let items = savedItems ?? [];
    let revisionItems = [];

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
      
      revisionItems = rows.map((i) => ({
        id: i.id, product_id: i.product_id, variant_id: i.variant_id,
        position: i.position, rotation: i.rotation, scale: i.scale,
      }));
      // Parse JSON fields for each item
      items = rows.map(i => ({
        ...i,
        position: parseJsonValue(i.position, {}),
        dimensions: parseJsonValue(i.dimensions, {}),
        rotation: parseFloat(i.rotation) || 0,
        scale: parseFloat(i.scale) || 1,
        elevation: 0,
      }));
    }

    res.json({
      ...project,
      revision: projectRevision(project, revisionItems),
      room_config: { ...roomConfig, items: undefined },
      items,
    });
  } catch (error) {
    console.error('[Projects API Error]', error);
    res.status(500).json({ message: 'Gagal mengambil data proyek' });
  }
});

// POST create project
router.post('/', optionalAuth, async (req, res) => {
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

    const storedRoomConfig = JSON.stringify(room_config || {});
    const result = await queryOptimizer.execute(
      'INSERT INTO projects (user_id, guest_token, name, room_type, room_config) VALUES (?, ?, ?, ?, ?)',
      [userId, guestToken, name, room_type, storedRoomConfig]
    );
    const created = await queryOptimizer.execute('SELECT * FROM projects WHERE id = ?', [result.insertId]);
    res.status(201).json({
      id: result.insertId,
      name,
      room_type,
      room_config,
      revision: projectRevision(created[0], []),
      guest_token: guestToken
    });
  } catch (error) {
    console.error('[Projects API Error]', error);
    res.status(500).json({ message: 'Gagal membuat proyek' });
  }
});

// PUT update project with mandatory optimistic revision checks.
router.put('/:id', optionalAuth, async (req, res) => {
  const { name, room_config, thumbnail, expected_revision } = req.body || {};
  if (expected_revision === undefined) {
    return res.status(428).json({ message: 'Muat ulang proyek sebelum menyimpan versi terbaru' });
  }
  if (typeof expected_revision !== 'string' || !/^[a-f0-9]{64}$/.test(expected_revision)) {
    return res.status(400).json({ message: 'Versi proyek tidak valid' });
  }
  const requestedRoomConfig = room_config === undefined || room_config === null ? null : parseJsonValue(room_config, null);
  if (requestedRoomConfig !== null && (typeof requestedRoomConfig !== 'object' || Array.isArray(requestedRoomConfig))) {
    return res.status(400).json({ message: 'Konfigurasi proyek tidak valid' });
  }
  if (!req.user && !req.guestToken) return res.status(403).json({ message: 'Akses ditolak' });

  let connection;
  let transactionOpen = false;
  try {
    connection = await queryOptimizer.pool.getConnection();
    await connection.beginTransaction();
    transactionOpen = true;
    const [rows] = req.user
      ? await connection.execute('SELECT * FROM projects WHERE id = ? AND user_id = ? FOR UPDATE', [req.params.id, req.user.id])
      : await connection.execute('SELECT * FROM projects WHERE id = ? AND guest_token = ? AND user_id IS NULL FOR UPDATE', [req.params.id, req.guestToken]);
    if (!rows.length) {
      await connection.rollback();
      transactionOpen = false;
      return res.status(404).json({ message: 'Proyek tidak ditemukan' });
    }
    const existingConfig = parseJsonValue(rows[0].room_config, {});
    const [legacyRows] = Array.isArray(existingConfig.items)
      ? [[]]
      : await connection.execute('SELECT id, product_id, variant_id, position, rotation, scale FROM project_items WHERE project_id = ? ORDER BY id', [req.params.id]);
    if (projectRevision(rows[0], legacyRows) !== expected_revision) {
      await connection.rollback();
      transactionOpen = false;
      return res.status(409).json({ message: 'Proyek berubah sejak terakhir dimuat. Muat ulang sebelum menyimpan.' });
    }

    let savedRoomConfig = null;
    if (room_config !== undefined && room_config !== null) {
      savedRoomConfig = requestedRoomConfig;
      if (!Array.isArray(savedRoomConfig.items) && Array.isArray(existingConfig.items)) {
        savedRoomConfig = { ...savedRoomConfig, items: existingConfig.items };
      }
    }
    const ownerPredicate = req.user ? 'user_id = ?' : 'guest_token = ? AND user_id IS NULL';
    const ownerValue = req.user ? req.user.id : req.guestToken;
    const updateSql = 'UPDATE projects SET name = COALESCE(?, name), room_config = COALESCE(?, room_config), ' +
      'thumbnail = COALESCE(?, thumbnail), updated_at = NOW() WHERE id = ? AND ' + ownerPredicate;
    await connection.execute(updateSql, [
      name || null,
      savedRoomConfig !== null ? JSON.stringify(savedRoomConfig) : null,
      thumbnail || null,
      req.params.id,
      ownerValue
    ]);
    const [updatedRows] = await connection.execute('SELECT * FROM projects WHERE id = ? FOR UPDATE', [req.params.id]);
    const updatedConfig = parseJsonValue(updatedRows[0].room_config, {});
    const revision = projectRevision(updatedRows[0], Array.isArray(updatedConfig.items) ? [] : legacyRows);
    await connection.commit();
    transactionOpen = false;
    return res.json({ message: 'Proyek diperbarui', revision });
  } catch (error) {
    if (transactionOpen) await connection.rollback();
    console.error('[Projects API Error]', error);
    return res.status(500).json({ message: 'Gagal memperbarui proyek' });
  } finally {
    if (connection) connection.release();
  }
});

// DELETE project
router.delete('/:id', optionalAuth, async (req, res) => {
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

// Lock and authorize the parent project before mutating its items.
async function lockProjectForMutation(connection, req) {
  if (!req.user && !req.guestToken) return { authorized: false, status: 403 };

  const [rows] = req.user
    ? await connection.execute(
      'SELECT id, room_config FROM projects WHERE id = ? AND user_id = ? FOR UPDATE',
      [req.params.id, req.user.id]
    )
    : await connection.execute(
      'SELECT id, room_config FROM projects WHERE id = ? AND guest_token = ? AND user_id IS NULL FOR UPDATE',
      [req.params.id, req.guestToken]
    );

  if (!rows.length) return { authorized: false, status: 404 };
  let roomConfig = rows[0].room_config || {};
  if (typeof roomConfig === 'string') {
    try { roomConfig = JSON.parse(roomConfig); } catch { roomConfig = {}; }
  }
  return { authorized: true, usesEmbeddedItems: Array.isArray(roomConfig.items) };
}

// POST add item ke project
router.post('/:id/items', optionalAuth, async (req, res) => {
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
      const access = await lockProjectForMutation(connection, req);
      if (!access.authorized) {
        await connection.rollback();
        return res.status(access.status).json({ message: access.status === 404 ? 'Proyek tidak ditemukan' : 'Akses ditolak' });
      }
      if (access.usesEmbeddedItems) {
        await connection.rollback();
        return res.status(409).json({ message: 'Item proyek ini dikelola sebagai satu snapshot; simpan perubahan melalui editor proyek.' });
      }

      
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
router.put('/:id/items/:itemId', optionalAuth, async (req, res) => {
  const { position, rotation, scale, variant_id } = req.body;
  
  try {
    // Optimized: Use transaction to ensure atomicity
    // Both UPDATE operations happen together or not at all
    const connection = await queryOptimizer.pool.getConnection();
    
    try {
      await connection.beginTransaction();
      const access = await lockProjectForMutation(connection, req);
      if (!access.authorized) {
        await connection.rollback();
        return res.status(access.status).json({ message: access.status === 404 ? 'Proyek tidak ditemukan' : 'Akses ditolak' });
      }
      if (access.usesEmbeddedItems) {
        await connection.rollback();
        return res.status(409).json({ message: 'Item proyek ini dikelola sebagai satu snapshot; simpan perubahan melalui editor proyek.' });
      }

      
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
router.delete('/:id/items/:itemId', optionalAuth, async (req, res) => {
  try {
    // Optimized: Use transaction to ensure atomicity
    // Both DELETE and UPDATE happen together or not at all
    const connection = await queryOptimizer.pool.getConnection();
    
    try {
      await connection.beginTransaction();
      const access = await lockProjectForMutation(connection, req);
      if (!access.authorized) {
        await connection.rollback();
        return res.status(access.status).json({ message: access.status === 404 ? 'Proyek tidak ditemukan' : 'Akses ditolak' });
      }
      if (access.usesEmbeddedItems) {
        await connection.rollback();
        return res.status(409).json({ message: 'Item proyek ini dikelola sebagai satu snapshot; simpan perubahan melalui editor proyek.' });
      }

      
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
