const router = require('express').Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const MAX_ORDER_AMOUNT_MINOR = 999999999999999n;
const MAX_ORDER_LINES = 100;
const isPositiveSafeInteger = (value) => Number.isSafeInteger(value) && value > 0;
const toMinorUnits = (value) => {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  const text = String(value);
  if (!/^\d{1,13}(?:\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ''] = text.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
};
const formatMinorUnits = (value) => `${value / 100n}.${String(value % 100n).padStart(2, '0')}`;

// GET orders milik user
router.get('/', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const [orders] = await conn.query(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(orders);
  } finally {
    conn.release();
  }
});

// GET single order
router.get('/:id', auth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const [orders] = await conn.query(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (orders.length === 0) return res.status(404).json({ message: 'Order tidak ditemukan' });

    const [items] = await conn.query(
      `SELECT oi.*, p.name, p.thumbnail, pv.name as variant_name, pv.color
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       LEFT JOIN product_variants pv ON pv.id = oi.variant_id
       WHERE oi.order_id = ?`,
      [req.params.id]
    );

    res.json({ ...orders[0], shipping_address: JSON.parse(orders[0].shipping_address || '{}'), items });
  } finally {
    conn.release();
  }
});

// POST create order dari project
router.post('/', auth, async (req, res) => {
  const { project_id, shipping_address, items } = req.body;
  if (project_id !== undefined && project_id !== null && !isPositiveSafeInteger(project_id)) {
    return res.status(400).json({ message: 'Proyek order tidak valid' });
  }
  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ message: 'Tidak ada item dalam order' });
  if (items.length > MAX_ORDER_LINES)
    return res.status(400).json({ message: `Order maksimal ${MAX_ORDER_LINES} baris item` });

  if (items.some((item) => !item || typeof item !== 'object' || Array.isArray(item) ||
      !isPositiveSafeInteger(item.product_id) ||
      (item.variant_id !== undefined && item.variant_id !== null && !isPositiveSafeInteger(item.variant_id)) ||
      !isPositiveSafeInteger(item.quantity) || item.quantity > 2147483647 ||
      toMinorUnits(item.price) === null)) {
    return res.status(400).json({ message: 'Data item order tidak valid' });
  }

  const subtotalMinor = items.reduce((sum, item) => sum + toMinorUnits(item.price) * BigInt(item.quantity), 0n);
  const shippingMinor = 5000000n;
  const totalMinor = subtotalMinor + shippingMinor;
  if (subtotalMinor > MAX_ORDER_AMOUNT_MINOR || totalMinor > MAX_ORDER_AMOUNT_MINOR) {
    return res.status(400).json({ message: 'Nilai order melebihi batas yang didukung' });
  }
  const subtotal = formatMinorUnits(subtotalMinor);
  const shipping = formatMinorUnits(shippingMinor);
  const total = formatMinorUnits(totalMinor);
  const orderItems = items.map((item) => ({ ...item, price: formatMinorUnits(toMinorUnits(item.price)) }));

  const conn = await pool.getConnection();
  let transactionOpen = false;
  try {
    await conn.beginTransaction();
    transactionOpen = true;
    if (project_id !== undefined && project_id !== null) {
      const [projects] = await conn.query(
        'SELECT id FROM projects WHERE id = ? AND user_id = ? FOR UPDATE',
        [project_id, req.user.id]
      );
      if (!projects.length) {
        await conn.rollback();
        transactionOpen = false;
        return res.status(404).json({ message: 'Proyek order tidak ditemukan' });
      }
    }
    const variantItems = items.filter((item) => item.variant_id !== undefined && item.variant_id !== null);
    if (variantItems.length) {
      const variantIds = [...new Set(variantItems.map((item) => item.variant_id))].sort((a, b) => a - b);
      const placeholders = variantIds.map(() => '?').join(', ');
      const [variants] = await conn.query(
        `SELECT id, product_id FROM product_variants WHERE id IN (${placeholders}) ORDER BY id FOR UPDATE`,
        variantIds
      );
      const productByVariant = new Map(variants.map((variant) => [Number(variant.id), Number(variant.product_id)]));
      if (variantItems.some((item) => productByVariant.get(item.variant_id) !== item.product_id)) {
        await conn.rollback();
        transactionOpen = false;
        return res.status(400).json({ message: 'Varian tidak sesuai dengan produk order' });
      }
    }
    const orderCode = `ILENA-${uuidv4()}`;
    const [result] = await conn.query(
      'INSERT INTO orders (user_id, project_id, order_code, subtotal, shipping_cost, total, shipping_address, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, project_id || null, orderCode, subtotal, shipping, total, JSON.stringify(shipping_address), 'pending']
    );

    const orderId = result.insertId;
    const itemRows = orderItems.map(() => '(?, ?, ?, ?, ?)').join(', ');
    const itemParams = orderItems.flatMap((item) => [
      orderId, item.product_id, item.variant_id || null, item.quantity, item.price,
    ]);
    await conn.query(
      `INSERT INTO order_items (order_id, product_id, variant_id, quantity, price) VALUES ${itemRows}`,
      itemParams
    );

    await conn.commit();
    transactionOpen = false;

    // Send new order notification to admins
    const notificationService = req.app.get('notificationService');
    if (notificationService) {
      const customerName = shipping_address?.name || 'Customer';
      const message = `New order #${orderCode} from ${customerName} - Rp ${Number(total).toLocaleString('id-ID')}`;
      
      setImmediate(async () => {
        try {
          await notificationService.createNotification(
            'new_order',
            message,
            'order',
            orderId,
            { order_code: orderCode, customer_name: customerName, total: Number(total) }
          );
        } catch (error) {
          console.error('[Orders] Failed to send notification:', error);
        }
      });
    }

    res.status(201).json({ id: orderId, order_code: orderCode, total: Number(total) });
  } catch (err) {
    if (transactionOpen) {
      await conn.rollback();
      transactionOpen = false;
    }
    throw err;
  } finally {
    conn.release();
  }
});

module.exports = router;
