-- Migration: Modify orders foreign key constraint to allow user deletion
-- This allows users to be deleted while preserving their order history
-- Orders will remain in the database with user_id reference intact for historical records

USE ilena_interior;

-- Drop the existing foreign key constraint on user_id
-- First, we need to find the constraint name
SELECT CONSTRAINT_NAME 
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
WHERE TABLE_SCHEMA = 'ilena_interior' 
  AND TABLE_NAME = 'orders' 
  AND COLUMN_NAME = 'user_id' 
  AND REFERENCED_TABLE_NAME = 'users';

-- Drop the constraint (replace 'orders_ibfk_1' with actual constraint name if different)
ALTER TABLE orders DROP FOREIGN KEY orders_ibfk_1;

-- Add index on user_id for query performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_user_id ON orders(user_id);

-- Verify the change
SHOW CREATE TABLE orders;
