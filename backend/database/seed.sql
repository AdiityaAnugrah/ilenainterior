USE ilena_interior;

-- ---------------------------------------------
-- SEED: Products (20 produk contoh)
-- ---------------------------------------------
INSERT INTO products (sku, name, category, description, price, dimensions, thumbnail, tags, stock) VALUES
-- SOFA
('SF-001', 'Sofa Scandinavian 3-Seater', 'sofa', 'Sofa modern minimalis dengan kaki kayu solid dan busa premium. Cocok untuk ruang tamu bergaya Scandinavian.', 4500000, '{"width":210,"depth":85,"height":80}', '/images/products/sf-001.jpg', '["modern","scandinavian","minimalis"]', 15),
('SF-002', 'Sofa L-Shape Velvet', 'sofa', 'Sofa sudut mewah dengan bahan velvet premium. Kapasitas 5-6 orang.', 8900000, '{"width":280,"depth":160,"height":85}', '/images/products/sf-002.jpg', '["mewah","velvet","besar"]', 8),
('SF-003', 'Sofa Minimalis 2-Seater', 'sofa', 'Sofa compact untuk ruangan kecil. Desain clean dan elegan.', 2800000, '{"width":150,"depth":80,"height":78}', '/images/products/sf-003.jpg', '["minimalis","compact","modern"]', 20),

-- MEJA
('MJ-001', 'Coffee Table Kayu Jati', 'meja', 'Meja tamu dari kayu jati solid dengan finishing natural. Tahan lama dan elegan.', 2200000, '{"width":120,"depth":60,"height":45}', '/images/products/mj-001.jpg', '["kayu","natural","klasik"]', 12),
('MJ-002', 'Meja Makan 6 Kursi', 'meja', 'Set meja makan kayu dengan 6 kursi. Desain timeless cocok berbagai gaya interior.', 6800000, '{"width":180,"depth":90,"height":76}', '/images/products/mj-002.jpg', '["makan","set","kayu"]', 6),
('MJ-003', 'Side Table Marble Top', 'meja', 'Meja samping dengan top marmer putih dan kaki metal hitam. Tampilan premium.', 1500000, '{"width":45,"depth":45,"height":55}', '/images/products/mj-003.jpg', '["marmer","premium","modern"]', 25),
('MJ-004', 'Meja Kerja Minimalis', 'meja', 'Meja kerja dengan desain minimalis, laci kecil, dan permukaan luas. Cocok untuk home office.', 1900000, '{"width":140,"depth":65,"height":75}', '/images/products/mj-004.jpg', '["kerja","office","minimalis"]', 18),

-- KURSI
('KR-001', 'Kursi Accent Velvet', 'kursi', 'Kursi single dengan bahan velvet warna-warni. Menjadi statement piece ruang tamu.', 1200000, '{"width":75,"depth":70,"height":85}', '/images/products/kr-001.jpg', '["accent","velvet","colorful"]', 30),
('KR-002', 'Kursi Makan Kayu Scandinavian', 'kursi', 'Kursi makan dengan desain Scandinavian. Ringan dan ergonomis.', 650000, '{"width":45,"depth":50,"height":80}', '/images/products/kr-002.jpg', '["scandinavian","kayu","makan"]', 50),
('KR-003', 'Kursi Gaming Ergonomis', 'kursi', 'Kursi gaming dengan lumbar support, armrest adjustable, dan sandaran bisa rebahan 160°.', 3200000, '{"width":70,"depth":70,"height":125}', '/images/products/kr-003.jpg', '["gaming","ergonomis","adjustable"]', 10),

-- RAK
('RK-001', 'Rak Buku Minimalis 5 Tingkat', 'rak', 'Rak buku kayu dengan 5 tingkat. Kapasitas besar namun tetap ramping.', 1800000, '{"width":80,"depth":30,"height":180}', '/images/products/rk-001.jpg', '["buku","kayu","minimalis"]', 22),
('RK-002', 'Floating Shelf Set 3', 'rak', 'Set 3 rak dinding mengambang. Cocok untuk display koleksi atau tanaman.', 450000, '{"width":60,"depth":20,"height":5}', '/images/products/rk-002.jpg', '["dinding","floating","dekorasi"]', 40),
('RK-003', 'Lemari TV Minimalis', 'rak', 'Unit TV cabinet dengan laci tersembunyi dan ruang untuk konsol game.', 2500000, '{"width":180,"depth":45,"height":55}', '/images/products/rk-003.jpg', '["tv","cabinet","minimalis"]', 14),

-- LAMPU
('LP-001', 'Pendant Light Industrial', 'lampu', 'Lampu gantung gaya industrial dengan material metal dan bohlam Edison.', 350000, '{"width":25,"depth":25,"height":120}', '/images/products/lp-001.jpg', '["industrial","gantung","metal"]', 35),
('LP-002', 'Floor Lamp Arc Modern', 'lampu', 'Lampu lantai dengan desain arc modern. Memberikan pencahayaan ambient yang hangat.', 890000, '{"width":35,"depth":35,"height":170}', '/images/products/lp-002.jpg', '["lantai","arc","ambient"]', 18),
('LP-003', 'Table Lamp Ceramic', 'lampu', 'Lampu meja dengan base keramik artisan. Cocok untuk kamar tidur atau meja kerja.', 480000, '{"width":20,"depth":20,"height":45}', '/images/products/lp-003.jpg', '["meja","keramik","kamar"]', 28),

-- DEKORASI
('DK-001', 'Cermin Bulat Kuningan', 'dekorasi', 'Cermin dinding bulat dengan bingkai kuningan. Diameter 80cm.', 750000, '{"width":80,"depth":5,"height":80}', '/images/products/dk-001.jpg', '["cermin","kuningan","dinding"]', 20),
('DK-002', 'Tanaman Artificial Set', 'dekorasi', 'Set tanaman artificial premium dalam pot semen. 3 ukuran berbeda.', 380000, '{"width":15,"depth":15,"height":60}', '/images/products/dk-002.jpg', '["tanaman","artificial","dekorasi"]', 45),
('DK-003', 'Karpet Bohemian 200x300', 'dekorasi', 'Karpet ukuran besar dengan motif bohemian. Material wol premium, anti slip.', 1900000, '{"width":300,"depth":200,"height":1}', '/images/products/dk-003.jpg', '["karpet","bohemian","wol"]', 12),
('DK-004', 'Vas Keramik Set 3', 'dekorasi', 'Set 3 vas keramik dengan berbagai ukuran. Finishing matte warna earthy.', 320000, '{"width":12,"depth":12,"height":30}', '/images/products/dk-004.jpg', '["vas","keramik","dekorasi"]', 35);

-- ---------------------------------------------
-- SEED: Product Variants
-- ---------------------------------------------
INSERT INTO product_variants (product_id, name, color, stock) VALUES
-- Sofa Scandinavian
(1, 'Abu-abu', '#9E9E9E', 5),
(1, 'Krem', '#F5F0E8', 5),
(1, 'Navy', '#1A237E', 5),
-- Sofa L-Shape
(2, 'Hijau Sage', '#87A878', 3),
(2, 'Abu Gelap', '#424242', 3),
(2, 'Krem Premium', '#EDE7D9', 2),
-- Kursi Accent
(8, 'Dusty Pink', '#E8A0B4', 10),
(8, 'Mustard', '#F5C842', 10),
(8, 'Forest Green', '#2E7D32', 10),
-- Kursi Makan
(9, 'Natural', '#D4A574', 20),
(9, 'Putih', '#FFFFFF', 15),
(9, 'Hitam', '#212121', 15);

-- ---------------------------------------------
-- SEED: Wallpapers
-- ---------------------------------------------
INSERT INTO wallpapers (name, category, price_per_meter, texture_pattern, color, description) VALUES
('Putih Polos Premium', 'polos', 45000, 'plain', '#FAFAFA', 'Wallpaper polos putih bersih, cocok untuk semua gaya interior.'),
('Krem Hangat', 'polos', 45000, 'plain', '#EDE7D9', 'Wallpaper polos warna krem hangat, memberikan kesan homey.'),
('Sage Green Matte', 'polos', 55000, 'plain', '#B5C4B1', 'Hijau sage elegan dengan finishing matte premium.'),
('Bata Ekspos Natural', 'tekstur', 75000, 'brick', '#C4845A', 'Motif bata ekspos gaya industrial, memberikan karakter kuat pada ruangan.'),
('Bata Putih Nordic', 'tekstur', 75000, 'brick', '#F0EDEA', 'Bata putih gaya Nordic Scandinavian yang bersih dan modern.'),
('Garis Klasik Abu', 'motif', 65000, 'stripes', '#D0D0D0', 'Motif garis vertikal klasik warna abu, memberi kesan ruangan lebih tinggi.'),
('Garis Navy Elegan', 'motif', 65000, 'stripes', '#2C3E6B', 'Garis navy yang elegan, cocok untuk ruang kerja atau kamar tidur pria.'),
('Geometris Putih', 'motif', 85000, 'geometric', '#F5F5F5', 'Pola geometris halus warna putih, modern dan minimalis.'),
('Geometris Gold', 'premium', 120000, 'geometric', '#D4AF6A', 'Pola geometris dengan aksen emas, mewah dan premium.'),
('Beton Industrial', 'tekstur', 70000, 'concrete', '#BDBDBD', 'Efek beton poles gaya industrial modern.'),
('Kayu Teak Natural', 'tekstur', 90000, 'wood', '#A0785A', 'Tekstur kayu teak natural, hangat dan organik.'),
('Kayu Putih Nordic', 'tekstur', 90000, 'wood', '#E8DDD0', 'Tekstur kayu light wood ala Nordic Scandinavian.'),
('Dusty Pink Polos', 'polos', 50000, 'plain', '#E8C4C4', 'Merah muda lembut dusty pink, feminin dan chic.'),
('Forest Green Deep', 'premium', 110000, 'plain', '#2D4A3E', 'Hijau forest gelap yang dramatis, cocok sebagai accent wall.'),
('Midnight Blue', 'premium', 110000, 'plain', '#1A2744', 'Biru malam premium, elegan dan sophisticated.');

-- ---------------------------------------------
-- SEED: Default Settings
-- ---------------------------------------------
INSERT INTO settings (`key`, `value`) VALUES
('whatsapp_number', '6281234567890')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);
