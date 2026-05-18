const router = require('express').Router();
const ExcelJS = require('exceljs');
const multer = require('multer');
const adminAuth = require('../middleware/adminAuth');
const pool = require('../config/db');

const CATEGORIES = ['sofa', 'meja', 'kursi', 'rak', 'lampu', 'dekorasi', 'kasur', 'lemari', 'aksesori', 'lainnya'];

const COLUMNS = [
  { key: 'sku',         header: 'SKU',          width: 18, required: true,  type: 'string' },
  { key: 'name',        header: 'Nama Produk',  width: 40, required: true,  type: 'string' },
  { key: 'category',    header: 'Kategori',     width: 14, required: true,  type: 'enum', enum: CATEGORIES },
  { key: 'price',       header: 'Harga (Rp)',   width: 14, required: true,  type: 'number', min: 0 },
  { key: 'stock',       header: 'Stok',         width: 10, required: false, type: 'number', min: 0, default: 0 },
  { key: 'width',       header: 'Lebar (cm)',   width: 12, required: false, type: 'number', min: 0, default: 0 },
  { key: 'depth',       header: 'Kedalaman (cm)', width: 14, required: false, type: 'number', min: 0, default: 0 },
  { key: 'height',      header: 'Tinggi (cm)',  width: 12, required: false, type: 'number', min: 0, default: 0 },
  { key: 'description', header: 'Deskripsi',    width: 50, required: false, type: 'string', default: '' },
  { key: 'tags',        header: 'Tags (pisah koma)', width: 30, required: false, type: 'string', default: '' },
  { key: 'is_active',   header: 'Aktif (1/0)',  width: 10, required: false, type: 'boolean', default: 1 },
];

// ─── TEMPLATE DOWNLOAD ───────────────────────────────────────────────────────
router.get('/products/import/template', adminAuth, async (req, res) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ILENA Admin';
  wb.created = new Date();

  const ws = wb.addWorksheet('Produk', { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = COLUMNS.map(c => ({ header: c.header, key: c.key, width: c.width }));

  // Header style
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF44403C' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'left' };
  headerRow.height = 24;

  // Required markers
  COLUMNS.forEach((c, i) => {
    if (c.required) {
      const cell = headerRow.getCell(i + 1);
      cell.value = `${c.header} *`;
    }
  });

  // Contoh row
  ws.addRow({
    sku: 'SOF-001', name: 'Sofa Modern 3-Seater', category: 'sofa',
    price: 3500000, stock: 10, width: 200, depth: 90, height: 85,
    description: 'Sofa modern dengan rangka kayu solid', tags: 'modern, minimalis, kayu',
    is_active: 1,
  });
  ws.addRow({
    sku: 'MEJ-002', name: 'Meja Kerja Industrial', category: 'meja',
    price: 1200000, stock: 5, width: 120, depth: 60, height: 75,
    description: '', tags: 'industrial, kayu', is_active: 1,
  });

  // Dropdown kategori untuk 500 row pertama
  ws.dataValidations.add('C2:C500', {
    type: 'list', allowBlank: false,
    formulae: [`"${CATEGORIES.join(',')}"`],
    showErrorMessage: true,
    errorTitle: 'Kategori tidak valid',
    error: `Pilih salah satu: ${CATEGORIES.join(', ')}`,
  });
  ws.dataValidations.add('K2:K500', {
    type: 'list', allowBlank: true,
    formulae: ['"1,0"'],
  });

  // Sheet panduan
  const help = wb.addWorksheet('Panduan');
  help.columns = [{ width: 25 }, { width: 80 }];
  const helpRows = [
    ['Field', 'Aturan'],
    ['SKU', 'Wajib. Unik. Akan dipakai untuk match file foto/GLB. Contoh: SOF-001'],
    ['Nama Produk', 'Wajib. Bebas (maks 200 karakter).'],
    ['Kategori', `Wajib. Pilih dari dropdown: ${CATEGORIES.join(', ')}`],
    ['Harga (Rp)', 'Wajib. Angka tanpa titik/koma. Contoh: 2500000'],
    ['Stok', 'Opsional. Default 0.'],
    ['Lebar/Kedalaman/Tinggi (cm)', 'Opsional. Pakai cm. Default 0.'],
    ['Deskripsi', 'Opsional. Bebas.'],
    ['Tags', 'Opsional. Pisah dengan koma. Contoh: modern, minimalis'],
    ['Aktif', '1 = tampil di katalog, 0 = draft. Default 1.'],
    ['', ''],
    ['File foto/GLB', 'Siapkan folder berisi file dengan nama SKU. Contoh: SOF-001.jpg dan SOF-001.glb'],
    ['Format foto', '.jpg / .jpeg / .png / .webp (akan auto-kompres jadi WebP)'],
    ['Format GLB', '.glb (akan auto-kompres pakai Meshopt)'],
    ['Tidak ada foto?', 'Boleh. Produk akan dibuat tanpa foto, bisa di-edit nanti.'],
  ];
  helpRows.forEach((row, i) => {
    const r = help.addRow(row);
    if (i === 0) {
      r.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF44403C' } };
    }
  });

  const buf = await wb.xlsx.writeBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="template_produk_ilena.xlsx"');
  res.send(Buffer.from(buf));
});

// ─── PARSE & VALIDATE ────────────────────────────────────────────────────────
function validateRow(raw, rowNumber, seenSkus) {
  const errors = [];
  const cleaned = {};

  for (const col of COLUMNS) {
    let v = raw[col.key];
    if (v === undefined || v === null || v === '') {
      if (col.required) { errors.push(`${col.header} wajib diisi`); continue; }
      cleaned[col.key] = col.default ?? null;
      continue;
    }
    if (typeof v === 'object' && v.text) v = v.text; // exceljs rich text
    v = String(v).trim();

    if (col.type === 'number') {
      const n = parseFloat(String(v).replace(/[^\d.-]/g, ''));
      if (isNaN(n)) { errors.push(`${col.header} harus angka`); continue; }
      if (col.min !== undefined && n < col.min) { errors.push(`${col.header} min ${col.min}`); continue; }
      cleaned[col.key] = n;
    } else if (col.type === 'boolean') {
      cleaned[col.key] = (v === '0' || v === 'false' || v === 'FALSE') ? 0 : 1;
    } else if (col.type === 'enum') {
      const lower = v.toLowerCase();
      if (!col.enum.includes(lower)) {
        errors.push(`${col.header} harus salah satu: ${col.enum.join(', ')}`);
        continue;
      }
      cleaned[col.key] = lower;
    } else {
      cleaned[col.key] = v;
    }
  }

  // SKU uniqueness dalam file
  if (cleaned.sku) {
    if (seenSkus.has(cleaned.sku)) errors.push(`SKU duplikat di file (juga ada di baris ${seenSkus.get(cleaned.sku)})`);
    else seenSkus.set(cleaned.sku, rowNumber);
  }

  return { row: rowNumber, data: cleaned, errors };
}

// ─── PREVIEW ENDPOINT ────────────────────────────────────────────────────────
// Accept xlsx in-memory, return parsed rows + per-row errors + DB duplicate check
const memUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/products/import/preview',
  adminAuth,
  memUpload.single('xlsx'),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'File xlsx wajib di-upload' });

    let wb;
    try {
      wb = new ExcelJS.Workbook();
      await wb.xlsx.load(req.file.buffer);
    } catch {
      return res.status(400).json({ message: 'File xlsx rusak atau format salah' });
    }

    const ws = wb.getWorksheet('Produk') || wb.worksheets[0];
    if (!ws) return res.status(400).json({ message: 'Sheet "Produk" tidak ditemukan' });

    // Map header → column key
    const headerRow = ws.getRow(1);
    const colMap = {}; // colIndex → key
    headerRow.eachCell((cell, colNum) => {
      const text = String(cell.value || '').replace(/\*/g, '').trim();
      const col = COLUMNS.find(c => c.header.toLowerCase() === text.toLowerCase());
      if (col) colMap[colNum] = col.key;
    });

    if (Object.keys(colMap).length === 0) {
      return res.status(400).json({ message: 'Header kolom tidak dikenali. Pakai template yang disediakan.' });
    }

    const seenSkus = new Map();
    const rows = [];
    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;
      const raw = {};
      row.eachCell({ includeEmpty: true }, (cell, colNum) => {
        const key = colMap[colNum];
        if (key) raw[key] = cell.value;
      });
      // Skip fully-empty rows
      if (Object.values(raw).every(v => v === null || v === undefined || v === '')) return;
      rows.push(validateRow(raw, rowNumber, seenSkus));
    });

    if (rows.length === 0) {
      return res.status(400).json({ message: 'File tidak berisi data produk' });
    }

    // Cek SKU yang sudah ada di DB
    const skus = rows.map(r => r.data.sku).filter(Boolean);
    if (skus.length > 0) {
      const conn = await pool.getConnection();
      try {
        const placeholders = skus.map(() => '?').join(',');
        const [existing] = await conn.query(
          `SELECT sku FROM products WHERE sku IN (${placeholders})`,
          skus,
        );
        const existingSet = new Set(existing.map(r => r.sku));
        rows.forEach(r => {
          if (r.data.sku && existingSet.has(r.data.sku)) {
            r.errors.push(`SKU "${r.data.sku}" sudah ada di database`);
          }
        });
      } finally {
        conn.release();
      }
    }

    const okCount = rows.filter(r => r.errors.length === 0).length;
    const errCount = rows.length - okCount;

    res.json({
      totalRows: rows.length,
      okCount,
      errCount,
      rows,
    });
  },
);

module.exports = router;
