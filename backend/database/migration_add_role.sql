-- Jalankan di phpMyAdmin setelah schema.sql
USE ilena_interior;

-- Tambah kolom role ke users
ALTER TABLE users
  ADD COLUMN role ENUM('user','admin') NOT NULL DEFAULT 'user' AFTER avatar;

-- Jangan membuat akun dengan kredensial tetap di migrasi.
-- Setelah migrasi role selesai, jalankan `node scripts/bootstrap-admin.js`
-- dari direktori backend untuk membuat admin pertama dengan password interaktif.
-- Untuk akun admin yang sudah ada, gunakan `node scripts/bootstrap-admin.js --reset-password`.
