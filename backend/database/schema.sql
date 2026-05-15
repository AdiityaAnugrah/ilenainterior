-- =============================================
-- ILENA INTERIOR — Database Schema
-- =============================================

CREATE DATABASE IF NOT EXISTS ilena_interior
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ilena_interior;

-- ---------------------------------------------
-- USERS
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(150) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  avatar      VARCHAR(500) NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ---------------------------------------------
-- PRODUCTS
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  sku             VARCHAR(50)  NOT NULL UNIQUE,
  name            VARCHAR(200) NOT NULL,
  category        ENUM('sofa','meja','kursi','rak','lampu','dekorasi','kasur','lemari','lainnya') NOT NULL,
  description     TEXT,
  price           DECIMAL(15,2) NOT NULL,
  dimensions      JSON,
  thumbnail       VARCHAR(500),
  model_3d        VARCHAR(500),
  model_2d_topdown VARCHAR(500),
  tags            JSON,
  stock           INT DEFAULT 0,
  is_active       TINYINT(1) DEFAULT 1,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_price    (price)
);

-- ---------------------------------------------
-- PRODUCT VARIANTS (warna/material)
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS product_variants (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  name       VARCHAR(100) NOT NULL,
  color      VARCHAR(20),
  model_3d   VARCHAR(500),
  stock      INT DEFAULT 0,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ---------------------------------------------
-- PROJECTS (proyek desain user)
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  name        VARCHAR(200) NOT NULL DEFAULT 'Proyek Baru',
  room_type   ENUM('ruang_tamu','kamar_tidur','dapur','kantor','lainnya') DEFAULT 'ruang_tamu',
  room_config JSON,
  thumbnail   VARCHAR(500),
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id)
);

-- ---------------------------------------------
-- PROJECT ITEMS (furniture di dalam proyek)
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS project_items (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  project_id  INT NOT NULL,
  product_id  INT NOT NULL,
  variant_id  INT NULL,
  position    JSON,
  rotation    FLOAT DEFAULT 0,
  scale       FLOAT DEFAULT 1,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL
);

-- ---------------------------------------------
-- ORDERS
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  user_id          INT NOT NULL,
  project_id       INT NULL,
  order_code       VARCHAR(50) NOT NULL UNIQUE,
  status           ENUM('pending','paid','processing','shipped','delivered','cancelled') DEFAULT 'pending',
  subtotal         DECIMAL(15,2) NOT NULL,
  shipping_cost    DECIMAL(15,2) DEFAULT 0,
  discount         DECIMAL(15,2) DEFAULT 0,
  total            DECIMAL(15,2) NOT NULL,
  shipping_address JSON,
  notes            TEXT,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)    REFERENCES users(id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
);

-- ---------------------------------------------
-- ORDER ITEMS
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  order_id   INT NOT NULL,
  product_id INT NOT NULL,
  variant_id INT NULL,
  quantity   INT NOT NULL DEFAULT 1,
  price      DECIMAL(15,2) NOT NULL,
  FOREIGN KEY (order_id)   REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL
);

-- ---------------------------------------------
-- WALLPAPERS
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS wallpapers (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  name             VARCHAR(200) NOT NULL,
  category         ENUM('polos','motif','tekstur','premium') NOT NULL DEFAULT 'polos',
  price_per_meter  DECIMAL(15,2) NOT NULL DEFAULT 0,
  thumbnail        VARCHAR(500) NULL,
  texture_pattern  VARCHAR(50) NOT NULL DEFAULT 'plain',
  color            VARCHAR(20) NOT NULL DEFAULT '#FFFFFF',
  description      TEXT,
  is_active        TINYINT(1) DEFAULT 1,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category  (category),
  INDEX idx_is_active (is_active)
);

-- ---------------------------------------------
-- SETTINGS
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  `key`        VARCHAR(100) NOT NULL PRIMARY KEY,
  `value`      TEXT,
  updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
