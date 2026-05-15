-- =============================================
-- Migration: Wallpaper + Settings
-- =============================================

USE ilena_interior;

-- Tabel wallpaper (produk dinding)
CREATE TABLE IF NOT EXISTS wallpapers (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(200) NOT NULL,
  category        ENUM('polos','motif','tekstur','premium') DEFAULT 'polos',
  price_per_meter DECIMAL(15,2) NOT NULL DEFAULT 0,
  thumbnail       VARCHAR(500),
  texture_pattern VARCHAR(50) DEFAULT 'plain',
  color           VARCHAR(20) DEFAULT '#FFFFFF',
  description     TEXT,
  is_active       TINYINT(1) DEFAULT 1,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_active (is_active)
);

-- Tabel settings (untuk nomor WA dll)
CREATE TABLE IF NOT EXISTS settings (
  id        INT AUTO_INCREMENT PRIMARY KEY,
  `key`     VARCHAR(100) NOT NULL UNIQUE,
  `value`   TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Seed nomor WA default
INSERT INTO settings (`key`, `value`) VALUES
  ('whatsapp_number', '6281234567890')
ON DUPLICATE KEY UPDATE `key` = `key`;

-- Seed wallpaper awal
INSERT INTO wallpapers (name, category, price_per_meter, texture_pattern, color, description) VALUES
  ('Putih Polos',       'polos',    50000,  'plain',     '#FFFFFF', 'Wallpaper polos warna putih bersih'),
  ('Krem Klasik',       'polos',    55000,  'plain',     '#EDE7D9', 'Wallpaper polos krem klasik hangat'),
  ('Abu Elegan',        'polos',    55000,  'plain',     '#E8E8E8', 'Wallpaper polos abu-abu elegan'),
  ('Bata Ekspos',       'tekstur',  85000,  'brick',     '#C4965A', 'Wallpaper motif bata ekspos natural'),
  ('Garis Modern',      'motif',    75000,  'stripes',   '#D9D0C1', 'Wallpaper garis-garis modern minimalis'),
  ('Geometris Art',     'motif',    90000,  'geometric', '#C8D5C0', 'Wallpaper pola geometris artistik'),
  ('Beton Industrial',  'tekstur',  80000,  'concrete',  '#BDBDBD', 'Wallpaper efek beton industrial'),
  ('Kayu Natural',      'tekstur',  95000,  'wood',      '#A0785A', 'Wallpaper motif kayu natural'),
  ('Sage Premium',      'premium',  120000, 'plain',     '#C8D5C0', 'Wallpaper premium warna sage'),
  ('Terracotta Lux',    'premium',  130000, 'plain',     '#D4A08A', 'Wallpaper premium terracotta mewah'),
  ('Navy Deep',         'premium',  125000, 'plain',     '#2C3E50', 'Wallpaper premium navy deep'),
  ('Emerald Forest',    'premium',  135000, 'plain',     '#2D6A4F', 'Wallpaper premium hijau emerald');
