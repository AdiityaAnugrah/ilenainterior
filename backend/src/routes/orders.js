const router = require('express').Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

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
  if (!items || items.length === 0)
    return res.status(400).json({ message: 'Tidak ada item dalam order' });

  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    const orderCode = `ILENA-${Date.now()}`;
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const shipping = 50000;
    const total = subtotal + shipping;

    const [result] = await conn.query(
      'INSERT INTO orders (user_id, project_id, order_code, subtotal, shipping_cost, total, shipping_address, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, project_id || null, orderCode, subtotal, shipping, total, JSON.stringify(shipping_address), 'pending']
    );

    const orderId = result.insertId;
    for (const item of items) {
      await conn.query(
        'INSERT INTO order_items (order_id, product_id, variant_id, quantity, price) VALUES (?, ?, ?, ?, ?)',
        [orderId, item.product_id, item.variant_id || null, item.quantity, item.price]
      );
    }

    await conn.commit();

    // Send new order notification to admins
    const notificationService = req.app.get('notificationService');
    if (notificationService) {
      const customerName = shipping_address?.name || 'Customer';
      const message = `New order #${orderCode} from ${customerName} - Rp ${total.toLocaleString('id-ID')}`;
      
      setImmediate(async () => {
        try {
          await notificationService.createNotification(
            'new_order',
            message,
            'order',
            orderId,
            { order_code: orderCode, customer_name: customerName, total }
          );
        } catch (error) {
          console.error('[Orders] Failed to send notification:', error);
        }
      });
    }

    res.status(201).json({ id: orderId, order_code: orderCode, total });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

module.exports = router;
