-- Migration: Admin Audit Logs
-- Description: Tracks important admin mutations for security and debugging.

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
