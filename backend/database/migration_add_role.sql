-- Jalankan di phpMyAdmin setelah schema.sql
USE ilena_interior;

-- Tambah kolom role ke users
ALTER TABLE users
  ADD COLUMN role ENUM('user','admin') NOT NULL DEFAULT 'user' AFTER avatar;

-- Buat akun admin pertama
-- Password default: admin123 (ganti setelah login pertama!)
INSERT INTO users (name, email, password, role) VALUES (
  'Admin ILENA',
  'admin@ilena.com',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: password
  'admin'
) ON DUPLICATE KEY UPDATE role = 'admin';
