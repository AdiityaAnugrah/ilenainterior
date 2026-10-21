const express = require('express');
const { randomUUID } = require('crypto');
const pool = require('../config/db');
const trackingAuth = require('../middleware/roleAuth')('admin', 'ads_analyst');
const capi = require('../services/metaCapi');
const router = express.Router();
const admin = express.Router();
const buckets = new Map();
setInterval(() => { const now = Date.now(); for (const [key, value] of buckets) if (value.until <= now) buckets.delete(key); }, 60000).unref();

function sourceUrl(value) {
  const url = new URL(value);
  const allowed = (process.env.CLIENT_URL || 'http://localhost:3000').split(',').map(item => new URL(item.trim()).origin);
  if (!['http:', 'https:'].includes(url.protocol) || !allowed.includes(url.origin) || url.username || url.password) throw new Error('URL event tidak valid');
  if (/^\/(admin|login|register)(\/|$)/.test(url.pathname)) throw new Error('Halaman ini tidak dilacak');
  return url.origin + url.pathname; // Never forward query strings or fragments.
}

function eventHandler(sendEvent, eventName) { return async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const key = req.ip || 'unknown';
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || bucket.until <= now) { bucket = { count: 0, until: now + 60000 }; buckets.set(key, bucket); }
  if (++bucket.count > 60) return res.status(429).json({ message: 'Terlalu banyak event' });
  const body = req.body || {};
  let url;
  try {
    if (typeof body.event_id !== 'string' || !/^[A-Za-z0-9_-]{8,100}$/.test(body.event_id)) throw new Error();
    url = sourceUrl(body.event_source_url);
    if (req.get('origin') !== new URL(url).origin) throw new Error();
    if (!req.get('user-agent')) throw new Error();
  } catch { return res.status(400).json({ message: 'Event tidak valid' }); }
  try {
    const settings = await capi.getSettings();
    const result = await sendEvent(settings, { eventId: body.event_id, sourceUrl: url,
      userAgent: req.get('user-agent'), ip: req.ip, fbp: body.fbp, fbc: body.fbc });
    await require('../services/adsAnalytics').recordEvent(eventName, body.event_id, url, result.skipped ? 'skipped' : 'sent');
    return res.status(result.skipped ? 204 : 200).json(result.skipped ? undefined : { ok: true });
  } catch {
    await require('../services/adsAnalytics').recordEvent(eventName, body.event_id, url, 'failed');
    return res.status(502).json({ message: 'Pengiriman event Meta belum berhasil' });
  }
}; }

router.post('/page-view', eventHandler(capi.sendPageView, 'PageView'));
router.post('/lead', eventHandler(capi.sendLead, 'Lead'));

admin.use(trackingAuth);
admin.get('/', async (req, res) => {
  const settings = await capi.getSettings();
  res.set('Cache-Control', 'no-store').json({ meta_pixel_id: settings.meta_pixel_id || '',
    meta_capi_enabled: settings.meta_capi_enabled === 'true', has_access_token: Boolean(settings.meta_capi_access_token),
    meta_capi_test_event_code: settings.meta_capi_test_event_code || '',
    meta_page_view_enabled: settings.meta_page_view_enabled !== 'false', meta_lead_enabled: settings.meta_lead_enabled !== 'false' });
});
admin.put('/', async (req, res) => {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();
    const [rows] = await conn.query('SELECT `key`, `value` FROM settings WHERE `key` IN (?) FOR UPDATE', [capi.KEYS]);
    let settings;
    try { settings = capi.validateSettings(req.body || {}, Object.fromEntries(rows.map(row => [row.key, row.value]))); }
    catch (error) { await conn.rollback(); return res.status(400).json({ message: error.message }); }
    for (const [key, value] of Object.entries(settings)) {
      await conn.query('INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?', [key, value, value]);
    }
    await conn.commit();
    res.json({ message: 'Pengaturan Meta CAPI disimpan', has_access_token: Boolean(settings.meta_capi_access_token) });
  } catch { if (conn) await conn.rollback(); res.status(500).json({ message: 'Gagal menyimpan Meta CAPI' }); }
  finally { conn?.release(); }
});
admin.post('/test', async (req, res) => {
  const eventName = req.body?.event_name || 'PageView';
  if (!['PageView', 'Lead'].includes(eventName)) return res.status(400).json({ message: 'Pilih PageView atau Lead' });
  try {
    const settings = await capi.getSettings();
    const send = eventName === 'Lead' ? capi.sendLead : capi.sendPageView;
    const result = await send(settings, { eventId: `test_${randomUUID()}`,
      sourceUrl: sourceUrl((process.env.CLIENT_URL || 'http://localhost:3000').split(',')[0].trim()),
      userAgent: req.get('user-agent'), ip: req.ip }, true);
    res.json({ message: 'Event uji diterima Meta. Periksa Test Events di Events Manager.', events_received: result.events_received });
  } catch { res.status(502).json({ message: 'Event uji gagal. Periksa konfigurasi tersimpan dan Test Event Code.' }); }
});

module.exports = { router, admin, sourceUrl };
