// Menghasilkan ikon PWA (PNG) dari wordmark sederhana memakai paket `canvas`.
// Jalankan sekali: `node scripts/generate-pwa-icons.js`
const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const OUT = path.join(__dirname, '..', 'public');

function draw(size, { maskable = false } = {}) {
  const c = createCanvas(size, size);
  const ctx = c.getContext('2d');

  // Latar gelap brand
  ctx.fillStyle = '#1c1917';
  ctx.fillRect(0, 0, size, size);

  // Huruf "I" sebagai mark; maskable pakai skala lebih kecil agar masuk safe-zone
  ctx.fillStyle = '#fafaf9';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const scale = maskable ? 0.42 : 0.58;
  ctx.font = `bold ${Math.round(size * scale)}px Georgia, "Times New Roman", serif`;
  ctx.fillText('I', size / 2, size / 2 + size * 0.02);

  return c.toBuffer('image/png');
}

const files = [
  ['icon-192.png', draw(192)],
  ['icon-512.png', draw(512)],
  ['icon-maskable-512.png', draw(512, { maskable: true })],
  ['apple-touch-icon.png', draw(180)],
];

for (const [name, buf] of files) {
  fs.writeFileSync(path.join(OUT, name), buf);
  console.log('wrote', name, buf.length, 'bytes');
}
