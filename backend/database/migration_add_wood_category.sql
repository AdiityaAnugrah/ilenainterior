-- =============================================
-- Migration: Add Wood Category to Wallpapers
-- Date: 2026-05-12
-- =============================================

USE ilena_interior;

-- Update wallpapers category enum to include 'kayu'
ALTER TABLE wallpapers 
MODIFY COLUMN category ENUM('polos','motif','tekstur','premium','kayu') NOT NULL DEFAULT 'polos';

-- Insert sample wood textures
INSERT INTO wallpapers (name, category, price_per_meter, texture_pattern, color, description, is_active) VALUES
('Kayu Jati Natural', 'kayu', 150000, 'wood_teak', '#8B4513', 'Panel kayu jati dengan tekstur natural dan serat kayu yang indah', 1),
('Kayu Oak Modern', 'kayu', 120000, 'wood_oak', '#D2691E', 'Panel kayu oak dengan finishing modern, cocok untuk ruang minimalis', 1),
('Kayu Pinus Rustic', 'kayu', 100000, 'wood_pine', '#DEB887', 'Panel kayu pinus dengan kesan rustic dan hangat', 1),
('Kayu Mahoni Klasik', 'kayu', 180000, 'wood_mahogany', '#C04000', 'Panel kayu mahoni dengan warna gelap elegan untuk kesan mewah', 1),
('Kayu Maple Terang', 'kayu', 110000, 'wood_maple', '#F5DEB3', 'Panel kayu maple dengan warna terang, memberikan kesan luas dan cerah', 1);

-- Verify insertion
SELECT id, name, category, price_per_meter, texture_pattern, color 
FROM wallpapers 
WHERE category = 'kayu';
