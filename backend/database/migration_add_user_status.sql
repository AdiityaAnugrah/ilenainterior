-- =============================================
-- Migration: Add user status column for account blocking
-- =============================================
-- Run after migration_add_role.sql
-- Safe to run multiple times (idempotent)
-- Date: 2026-05-14

USE ilena_interior;

-- Add status column if not exists
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS status ENUM('active','blocked') NOT NULL DEFAULT 'active' AFTER role;

-- Set all existing users to active status
UPDATE users SET status = 'active' WHERE status IS NULL OR status = '';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_role ON users(role);

-- Verify migration
SELECT 
  COUNT(*) as total_users,
  SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_users,
  SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked_users,
  SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as regular_users,
  SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admin_users
FROM users;

-- Show sample of updated users table structure
SELECT id, name, email, role, status, created_at 
FROM users 
LIMIT 5;
