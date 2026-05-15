-- Migration: Add guest project support
-- Date: 2026-05-12
-- Description: Add guest_token column to projects table to support unauthenticated users

-- Add guest_token column (nullable, UUID v4 format)
ALTER TABLE projects 
ADD COLUMN guest_token VARCHAR(36) NULL AFTER user_id;

-- Create index on guest_token for query performance
CREATE INDEX idx_guest_token ON projects(guest_token);

-- Modify user_id to be nullable (if not already)
ALTER TABLE projects 
MODIFY COLUMN user_id INT NULL;

-- Note: Constraint that either user_id OR guest_token must be set is enforced at application level
-- MySQL CHECK constraints are not reliable in older versions
