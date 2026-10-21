const router = require('express').Router();
const pool = require('../config/db');
const APICacheManager = require('../cache/CacheManager');

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
const invalidateWallpapersCache = (req, res, next) => {
  // Invalidate all wallpapers-related cache entries
  const invalidated = cacheManager.invalidate(/GET:\/wallpapers/);
  console.log(`[Cache Invalidation] Invalidated ${invalidated} wallpapers cache entries`);
  next();
};

// GET all wallpapers (public)
router.get('/', cacheMiddleware(300000), async (req, res) => { // 5 minutes cache
  const { category } = req.query;
  let where = ['is_active = 1'];
  const params = [];

  if (category && category !== 'all') {
    where.push('category = ?');
    params.push(category);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      `SELECT * FROM wallpapers ${whereClause} ORDER BY category, name`,
      params
    );
    res.json(rows);
  } finally {
    conn.release();
  }
});

// GET single wallpaper
router.get('/:id', cacheMiddleware(300000), async (req, res) => { // 5 minutes cache
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query('SELECT * FROM wallpapers WHERE id = ? AND is_active = 1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Wallpaper tidak ditemukan' });
    res.json(rows[0]);
  } finally {
    conn.release();
  }
});

// GET WhatsApp settings (public)
router.get('/settings/whatsapp', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      "SELECT `key`, `value` FROM settings WHERE `key` IN ('whatsapp_number', 'whatsapp_message')"
    );
    const settings = {};
    rows.forEach((row) => {
      settings[row.key] = row.value || '';
    });
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.json({
      whatsapp_number: settings.whatsapp_number || '',
      whatsapp_message: settings.whatsapp_message || 'Halo Ilena, mau tanya tanya koleksinya.',
    });
  } finally {
    conn.release();
  }
});

// GET public settings used by the storefront shell.
// Only expose non-secret IDs needed by browser-side marketing pixels.
router.get('/settings/public', async (req, res) => {
  const allowedKeys = [
    'whatsapp_number',
    'whatsapp_message',
    'google_tag_manager_id',
    'google_analytics_id',
    'tiktok_pixel_id',
    'meta_pixel_id',
  ];

  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      'SELECT `key`, `value` FROM settings WHERE `key` IN (?)',
      [allowedKeys]
    );
    const settings = {};
    rows.forEach((row) => {
      settings[row.key] = row.value || '';
    });
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.json({
      whatsapp_number: settings.whatsapp_number || '',
      google_tag_manager_id: settings.google_tag_manager_id || '',
      google_analytics_id: settings.google_analytics_id || '',
      tiktok_pixel_id: settings.tiktok_pixel_id || '',
      meta_pixel_id: settings.meta_pixel_id || '',
    });
  } finally {
    conn.release();
  }
});

module.exports = router;
