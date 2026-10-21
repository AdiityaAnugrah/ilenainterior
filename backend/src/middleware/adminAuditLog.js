const pool = require('../config/db');

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
let tableReadyPromise = null;

function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== 'object') return value;
  if (value.key === 'meta_capi_access_token') return { ...value, value: '[REDACTED]' };

  const sensitive = new Set([
    'password',
    'newPassword',
    'new_password',
    'token',
    'authorization',
    'jwt',
    'secret',
    'smtp_pass',
    'SMTP_PASS',
    'meta_capi_access_token',
  ]);

  return Object.fromEntries(
    Object.entries(value).map(([key, val]) => [
      key,
      sensitive.has(key) ? '[REDACTED]' : redact(val),
    ])
  );
}

async function ensureAuditTable() {
  if (!tableReadyPromise) {
    tableReadyPromise = pool.query(`
      CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        admin_id INT NULL,
        method VARCHAR(10) NOT NULL,
        path VARCHAR(255) NOT NULL,
        status_code INT NULL,
        ip VARCHAR(64) NULL,
        user_agent VARCHAR(255) NULL,
        request_body JSON NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_admin_created_at (admin_id, created_at),
        INDEX idx_created_at (created_at),
        INDEX idx_path (path)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `).catch((error) => {
      tableReadyPromise = null;
      throw error;
    });
  }
  return tableReadyPromise;
}

async function writeAuditLog(req, res) {
  if (!req.user?.id || !MUTATING_METHODS.has(req.method)) return;

  try {
    await ensureAuditTable();
    await pool.query(
      `INSERT INTO admin_audit_logs
       (admin_id, method, path, status_code, ip, user_agent, request_body)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        req.method,
        req.originalUrl,
        res.statusCode,
        req.ip || null,
        String(req.headers['user-agent'] || '').slice(0, 255),
        req.body ? JSON.stringify(redact(req.body)) : null,
      ]
    );
  } catch (error) {
    console.error('[Admin Audit Log] Failed to write audit log:', error.message);
  }
}

function adminAuditLog(req, res, next) {
  if (!MUTATING_METHODS.has(req.method)) return next();

  res.on('finish', () => {
    writeAuditLog(req, res);
  });

  next();
}

adminAuditLog.ensureAuditTable = ensureAuditTable;

module.exports = adminAuditLog;
