-- =============================================
-- ILENA INTERIOR — Performance Optimization Migration
-- Database Indexes for Query Performance
-- Created: 2026-05-11
-- =============================================
-- 
-- Purpose: Add performance indexes for frequently queried columns
-- to optimize database query performance and support multiple
-- concurrent users.
--
-- Requirements Reference: Requirement 6 - Database Query Optimization
-- Design Reference: Component 5 - QueryOptimizer - Database Indexes
--
-- This migration is idempotent and can be run multiple times safely.
-- =============================================

USE ilena_interior;

-- =============================================
-- PRODUCTS TABLE INDEXES
-- =============================================

-- Index for category filtering (already exists in schema.sql, but checking)
-- Products are frequently filtered by category in product listing
SELECT 'Checking products.category index...' AS status;
-- Note: idx_category already exists in schema.sql

-- Index for is_active filtering
-- Used to filter active/inactive products in listings and searches
DROP INDEX IF EXISTS idx_products_is_active ON products;
CREATE INDEX idx_products_is_active ON products(is_active);
SELECT 'Created index: idx_products_is_active' AS status;

-- Index for created_at sorting
-- Used for sorting products by newest/oldest in admin panel and listings
DROP INDEX IF EXISTS idx_products_created_at ON products;
CREATE INDEX idx_products_created_at ON products(created_at);
SELECT 'Created index: idx_products_created_at' AS status;

-- Composite index for active products sorted by creation date
-- Optimizes common query: SELECT * FROM products WHERE is_active = 1 ORDER BY created_at DESC
DROP INDEX IF EXISTS idx_products_active_created ON products;
CREATE INDEX idx_products_active_created ON products(is_active, created_at);
SELECT 'Created index: idx_products_active_created' AS status;

-- =============================================
-- PRODUCT_VARIANTS TABLE INDEXES
-- =============================================

-- Index for product_id foreign key
-- Used for JOIN operations and fetching variants for a specific product
-- This is critical for avoiding N+1 query problems
DROP INDEX IF EXISTS idx_variants_product_id ON product_variants;
CREATE INDEX idx_variants_product_id ON product_variants(product_id);
SELECT 'Created index: idx_variants_product_id' AS status;

-- =============================================
-- PROJECTS TABLE INDEXES
-- =============================================

-- Index for user_id foreign key (already exists in schema.sql, but checking)
-- Used for fetching all projects for a specific user
-- Note: idx_user already exists in schema.sql

-- Index for created_at sorting
-- Used for sorting user projects by newest/oldest
DROP INDEX IF EXISTS idx_projects_created_at ON projects;
CREATE INDEX idx_projects_created_at ON projects(created_at);
SELECT 'Created index: idx_projects_created_at' AS status;

-- Composite index for user projects sorted by creation date
-- Optimizes common query: SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC
DROP INDEX IF EXISTS idx_projects_user_created ON projects;
CREATE INDEX idx_projects_user_created ON projects(user_id, created_at);
SELECT 'Created index: idx_projects_user_created' AS status;

-- Index for room_type filtering
-- Used for filtering projects by room type
DROP INDEX IF EXISTS idx_projects_room_type ON projects;
CREATE INDEX idx_projects_room_type ON projects(room_type);
SELECT 'Created index: idx_projects_room_type' AS status;

-- =============================================
-- PROJECT_ITEMS TABLE INDEXES
-- =============================================

-- Index for project_id foreign key
-- Used for fetching all items in a specific project
-- Critical for project detail queries
DROP INDEX IF EXISTS idx_project_items_project_id ON project_items;
CREATE INDEX idx_project_items_project_id ON project_items(project_id);
SELECT 'Created index: idx_project_items_project_id' AS status;

-- Index for product_id foreign key
-- Used for finding which projects use a specific product
DROP INDEX IF EXISTS idx_project_items_product_id ON project_items;
CREATE INDEX idx_project_items_product_id ON project_items(product_id);
SELECT 'Created index: idx_project_items_product_id' AS status;

-- Index for variant_id foreign key
-- Used for finding which projects use a specific variant
DROP INDEX IF EXISTS idx_project_items_variant_id ON project_items;
CREATE INDEX idx_project_items_variant_id ON project_items(variant_id);
SELECT 'Created index: idx_project_items_variant_id' AS status;

-- Composite index for project items with product
-- Optimizes JOIN queries between project_items and products
DROP INDEX IF EXISTS idx_project_items_project_product ON project_items;
CREATE INDEX idx_project_items_project_product ON project_items(project_id, product_id);
SELECT 'Created index: idx_project_items_project_product' AS status;

-- =============================================
-- ORDERS TABLE INDEXES
-- =============================================

-- Index for user_id foreign key
-- Used for fetching all orders for a specific user
DROP INDEX IF EXISTS idx_orders_user_id ON orders;
CREATE INDEX idx_orders_user_id ON orders(user_id);
SELECT 'Created index: idx_orders_user_id' AS status;

-- Index for status filtering
-- Used for filtering orders by status (pending, paid, shipped, etc.)
DROP INDEX IF EXISTS idx_orders_status ON orders;
CREATE INDEX idx_orders_status ON orders(status);
SELECT 'Created index: idx_orders_status' AS status;

-- Index for created_at sorting
-- Used for sorting orders by date
DROP INDEX IF EXISTS idx_orders_created_at ON orders;
CREATE INDEX idx_orders_created_at ON orders(created_at);
SELECT 'Created index: idx_orders_created_at' AS status;

-- Composite index for user orders sorted by date
-- Optimizes common query: SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC
DROP INDEX IF EXISTS idx_orders_user_created ON orders;
CREATE INDEX idx_orders_user_created ON orders(user_id, created_at);
SELECT 'Created index: idx_orders_user_created' AS status;

-- Composite index for user orders filtered by status
-- Optimizes query: SELECT * FROM orders WHERE user_id = ? AND status = ?
DROP INDEX IF EXISTS idx_orders_user_status ON orders;
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
SELECT 'Created index: idx_orders_user_status' AS status;

-- Index for order_code lookup
-- Used for finding orders by order code (already UNIQUE, but explicit index helps)
DROP INDEX IF EXISTS idx_orders_order_code ON orders;
CREATE INDEX idx_orders_order_code ON orders(order_code);
SELECT 'Created index: idx_orders_order_code' AS status;

-- Index for project_id foreign key
-- Used for finding orders related to a specific project
DROP INDEX IF EXISTS idx_orders_project_id ON orders;
CREATE INDEX idx_orders_project_id ON orders(project_id);
SELECT 'Created index: idx_orders_project_id' AS status;

-- =============================================
-- ORDER_ITEMS TABLE INDEXES
-- =============================================

-- Index for order_id foreign key
-- Used for fetching all items in a specific order
DROP INDEX IF EXISTS idx_order_items_order_id ON order_items;
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
SELECT 'Created index: idx_order_items_order_id' AS status;

-- Index for product_id foreign key
-- Used for finding which orders contain a specific product
DROP INDEX IF EXISTS idx_order_items_product_id ON order_items;
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
SELECT 'Created index: idx_order_items_product_id' AS status;

-- Index for variant_id foreign key
-- Used for finding which orders contain a specific variant
DROP INDEX IF EXISTS idx_order_items_variant_id ON order_items;
CREATE INDEX idx_order_items_variant_id ON order_items(variant_id);
SELECT 'Created index: idx_order_items_variant_id' AS status;

-- =============================================
-- WALLPAPERS TABLE INDEXES
-- =============================================

-- Index for category filtering (already exists in schema.sql, but checking)
-- Wallpapers are frequently filtered by category
-- Note: idx_category already exists in schema.sql

-- Index for is_active filtering (already exists in schema.sql, but checking)
-- Used to filter active/inactive wallpapers
-- Note: idx_is_active already exists in schema.sql

-- Index for created_at sorting
-- Used for sorting wallpapers by newest/oldest
DROP INDEX IF EXISTS idx_wallpapers_created_at ON wallpapers;
CREATE INDEX idx_wallpapers_created_at ON wallpapers(created_at);
SELECT 'Created index: idx_wallpapers_created_at' AS status;

-- Composite index for active wallpapers sorted by creation date
-- Optimizes common query: SELECT * FROM wallpapers WHERE is_active = 1 ORDER BY created_at DESC
DROP INDEX IF EXISTS idx_wallpapers_active_created ON wallpapers;
CREATE INDEX idx_wallpapers_active_created ON wallpapers(is_active, created_at);
SELECT 'Created index: idx_wallpapers_active_created' AS status;

-- Composite index for category and active status
-- Optimizes query: SELECT * FROM wallpapers WHERE category = ? AND is_active = 1
DROP INDEX IF EXISTS idx_wallpapers_category_active ON wallpapers;
CREATE INDEX idx_wallpapers_category_active ON wallpapers(category, is_active);
SELECT 'Created index: idx_wallpapers_category_active' AS status;

-- =============================================
-- USERS TABLE INDEXES
-- =============================================

-- Index for email lookup (already UNIQUE, so has implicit index)
-- Used for authentication and user lookup

-- Index for created_at sorting
-- Used for admin panel to sort users by registration date
DROP INDEX IF EXISTS idx_users_created_at ON users;
CREATE INDEX idx_users_created_at ON users(created_at);
SELECT 'Created index: idx_users_created_at' AS status;

-- =============================================
-- VERIFICATION AND SUMMARY
-- =============================================

SELECT '========================================' AS '';
SELECT 'Performance Indexes Migration Complete' AS status;
SELECT '========================================' AS '';
SELECT '' AS '';

-- Show all indexes for verification
SELECT 'PRODUCTS TABLE INDEXES:' AS '';
SHOW INDEXES FROM products;
SELECT '' AS '';

SELECT 'PRODUCT_VARIANTS TABLE INDEXES:' AS '';
SHOW INDEXES FROM product_variants;
SELECT '' AS '';

SELECT 'PROJECTS TABLE INDEXES:' AS '';
SHOW INDEXES FROM projects;
SELECT '' AS '';

SELECT 'PROJECT_ITEMS TABLE INDEXES:' AS '';
SHOW INDEXES FROM project_items;
SELECT '' AS '';

SELECT 'ORDERS TABLE INDEXES:' AS '';
SHOW INDEXES FROM orders;
SELECT '' AS '';

SELECT 'ORDER_ITEMS TABLE INDEXES:' AS '';
SHOW INDEXES FROM order_items;
SELECT '' AS '';

SELECT 'WALLPAPERS TABLE INDEXES:' AS '';
SHOW INDEXES FROM wallpapers;
SELECT '' AS '';

SELECT 'USERS TABLE INDEXES:' AS '';
SHOW INDEXES FROM users;
SELECT '' AS '';

SELECT '========================================' AS '';
SELECT 'Migration completed successfully!' AS status;
SELECT 'All performance indexes have been created.' AS status;
SELECT '========================================' AS '';
