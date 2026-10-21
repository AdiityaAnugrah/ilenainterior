const router = require('express').Router();
const pool = require('../config/db');
router.use(require('../middleware/roleAuth')('admin', 'ads_analyst'));
const patterns = {
  google_tag_manager_id: /^GTM-[A-Z0-9]+$/i,
  google_analytics_id: /^G-[A-Z0-9]+$/i,
  tiktok_pixel_id: /^[A-Z0-9]{8,100}$/i,
};
router.get('/', async (req, res) => {
  const [rows] = await pool.query('SELECT `key`, `value` FROM settings WHERE `key` IN (?)', [Object.keys(patterns)]);
  const values = Object.fromEntries(rows.filter(row => row.key in patterns).map(row => [row.key, row.value || '']));
  res.set('Cache-Control', 'no-store').json(Object.fromEntries(Object.keys(patterns).map(key => [key, values[key] || ''])));
});
router.put('/', async (req, res) => {
  const entries = Object.entries(req.body || {});
  if (!entries.length || entries.some(([key, value]) => !Object.hasOwn(patterns, key) || typeof value !== 'string' || value.length > 100 || (value.trim() && !patterns[key].test(value.trim())))) {
    return res.status(400).json({ message: 'Pengaturan tracking tidak valid' });
  }
  let conn;
  try {
    conn = await pool.getConnection(); await conn.beginTransaction();
    for (const [key, value] of entries) await conn.query('INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?', [key, value.trim(), value.trim()]);
    await conn.commit(); res.json({ message: 'Tracking iklan disimpan' });
  } catch { if (conn) await conn.rollback(); res.status(500).json({ message: 'Gagal menyimpan tracking' }); }
  finally { conn?.release(); }
});
module.exports = router;
