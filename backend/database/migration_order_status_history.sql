-- =============================================
-- ILENA INTERIOR — Order Status History Migration
-- =============================================
-- This migration creates the status_history table for tracking
-- all order status changes with full audit trail

USE ilena_interior;

-- ---------------------------------------------
-- STATUS HISTORY (Audit Trail)
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS status_history (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  order_id    INT NOT NULL,
  old_status  ENUM('pending','paid','processing','shipped','delivered','cancelled') NOT NULL,
  new_status  ENUM('pending','paid','processing','shipped','delivered','cancelled') NOT NULL,
  changed_by  INT NOT NULL COMMENT 'Admin user ID who made the change',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id),
  INDEX idx_order_id (order_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add indexes to orders table for better query performance
ALTER TABLE orders 
  ADD INDEX IF NOT EXISTS idx_status (status),
  ADD INDEX IF NOT EXISTS idx_created_at (created_at),
  ADD INDEX IF NOT EXISTS idx_order_code (order_code);

-- Add index to order_items for faster joins
ALTER TABLE order_items
  ADD INDEX IF NOT EXISTS idx_order_id (order_id);
