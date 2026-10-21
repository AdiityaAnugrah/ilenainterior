ALTER TABLE users MODIFY COLUMN role ENUM('user','admin','ads_analyst') NOT NULL DEFAULT 'user';

CREATE TABLE IF NOT EXISTS meta_event_metrics (
  event_id VARCHAR(100) NOT NULL,
  event_name ENUM('PageView','Lead') NOT NULL,
  source_path VARCHAR(255) NOT NULL,
  delivery ENUM('sent','skipped','failed') NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (event_name, event_id),
  INDEX idx_meta_metrics_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
