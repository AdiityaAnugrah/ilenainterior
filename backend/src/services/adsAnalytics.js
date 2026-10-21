const pool = require('../config/db');

async function recordEvent(eventName, eventId, sourceUrl, delivery) {
  try {
    await pool.query(`INSERT INTO meta_event_metrics (event_id, event_name, source_path, delivery)
      VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE delivery = VALUES(delivery)`,
    [eventId, eventName, new URL(sourceUrl).pathname.slice(0, 255), delivery]);
  } catch { console.error('[Ads Analytics] Event metric not recorded'); }
}

async function getReport(days) {
  const [daily] = await pool.query(`SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS day,
    SUM(event_name = 'PageView') AS page_views, SUM(event_name = 'Lead') AS leads,
    SUM(delivery = 'sent') AS sent, SUM(delivery = 'skipped') AS skipped, SUM(delivery = 'failed') AS failed
    FROM meta_event_metrics WHERE created_at >= CURDATE() - INTERVAL ? DAY
    GROUP BY day ORDER BY day`, [days - 1]);
  const [pages] = await pool.query(`SELECT source_path,
    SUM(event_name = 'PageView') AS page_views, SUM(event_name = 'Lead') AS leads
    FROM meta_event_metrics WHERE created_at >= CURDATE() - INTERVAL ? DAY
    GROUP BY source_path ORDER BY leads DESC, page_views DESC LIMIT 20`, [days - 1]);
  const numberRows = rows => rows.map(row => Object.fromEntries(Object.entries(row).map(([key, value]) =>
    [key, ['day', 'source_path'].includes(key) ? value : Number(value || 0)])));
  const normalized = numberRows(daily);
  const summary = normalized.reduce((sum, row) => {
    for (const key of Object.keys(sum)) sum[key] += row[key];
    return sum;
  }, { page_views: 0, leads: 0, sent: 0, skipped: 0, failed: 0 });
  return { days, summary, daily: normalized, pages: numberRows(pages) };
}

module.exports = { recordEvent, getReport };
