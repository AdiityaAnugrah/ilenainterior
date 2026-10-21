const pool = require('../config/db');

const KEYS = ['meta_pixel_id', 'meta_capi_enabled', 'meta_capi_access_token', 'meta_capi_test_event_code'];
async function getSettings() {
  const [rows] = await pool.query('SELECT `key`, `value` FROM settings WHERE `key` IN (?)', [KEYS]);
  return Object.fromEntries(rows.map(row => [row.key, row.value || '']));
}

function validateSettings(body, current) {
  const pixel = typeof body.meta_pixel_id === 'string' ? body.meta_pixel_id.trim() : '';
  const token = typeof body.meta_capi_access_token === 'string' ? body.meta_capi_access_token.trim() : '';
  const testCode = typeof body.meta_capi_test_event_code === 'string' ? body.meta_capi_test_event_code.trim() : '';
  if (typeof body.meta_capi_enabled !== 'boolean') throw new Error('Status CAPI harus boolean');
  if (pixel && !/^\d{6,30}$/.test(pixel)) throw new Error('Meta Pixel ID harus 6–30 digit');
  if (token && !/^[A-Za-z0-9_|.-]{10,4096}$/.test(token)) throw new Error('Format Access Token tidak valid');
  if (testCode && !/^[A-Za-z0-9_-]{1,100}$/.test(testCode)) throw new Error('Test Event Code tidak valid');
  const accessToken = body.clear_token === true ? '' : token || current.meta_capi_access_token || '';
  if (body.meta_capi_enabled && (!pixel || !accessToken)) throw new Error('Pixel ID dan Access Token wajib diisi untuk mengaktifkan CAPI');
  return { meta_pixel_id: pixel, meta_capi_enabled: body.meta_capi_enabled ? 'true' : 'false', meta_capi_access_token: accessToken, meta_capi_test_event_code: testCode };
}

async function sendEvent(eventName, settings, { eventId, sourceUrl, userAgent, ip, fbp, fbc }, test = false) {
  if (settings.meta_capi_enabled !== 'true' && !test) return { skipped: true };
  if (!/^\d{6,30}$/.test(settings.meta_pixel_id || '') || !settings.meta_capi_access_token) throw new Error('Konfigurasi Meta CAPI belum lengkap');
  const userData = { client_user_agent: userAgent, client_ip_address: ip };
  if (/^fb\.\d+\.\d+\.[A-Za-z0-9._-]{1,400}$/.test(fbp || '')) userData.fbp = fbp;
  if (/^fb\.\d+\.\d+\.[A-Za-z0-9._-]{1,400}$/.test(fbc || '')) userData.fbc = fbc;
  const body = {
    access_token: settings.meta_capi_access_token,
    data: [{ event_name: eventName, event_time: Math.floor(Date.now() / 1000), event_id: eventId,
      action_source: 'website', event_source_url: sourceUrl, user_data: userData }],
  };
  if (settings.meta_capi_test_event_code) body.test_event_code = settings.meta_capi_test_event_code;
  if (test && !body.test_event_code) throw new Error('Isi Test Event Code sebelum mengirim event uji');
  const version = process.env.META_GRAPH_API_VERSION || 'v25.0';
  if (!/^v\d+\.0$/.test(version)) throw new Error('Versi Graph API tidak valid');
  const response = await fetch(`https://graph.facebook.com/${version}/${settings.meta_pixel_id}/events`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(5000),
  });
  const result = await response.json();
  // Never expose the Graph response or request: either may include credentials.
  if (!response.ok || result.error || !(result.events_received > 0)) throw new Error('Meta menolak event. Periksa Pixel ID, token, dan Test Event Code.');
  return { events_received: result.events_received };
}

const sendPageView = (settings, event, test = false) => sendEvent('PageView', settings, event, test);
const sendLead = (settings, event) => sendEvent('Lead', settings, event);
module.exports = { KEYS, getSettings, validateSettings, sendPageView, sendLead };
