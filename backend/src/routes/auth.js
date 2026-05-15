const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// Register
router.post('/register', async (req, res) => {
  const { name, email, password, guest_token } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ message: 'Semua field wajib diisi' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [existing] = await conn.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      await conn.rollback();
      return res.status(409).json({ message: 'Email sudah terdaftar' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const [result] = await conn.query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashed]
    );

    const userId = result.insertId;

    // Auto-claim guest projects if guest_token provided
    let claimedCount = 0;
    if (guest_token) {
      try {
        const [claimResult] = await conn.query(
          `UPDATE projects 
           SET user_id = ?, guest_token = NULL, updated_at = NOW() 
           WHERE guest_token = ? AND user_id IS NULL`,
          [userId, guest_token]
        );
        claimedCount = claimResult.affectedRows;
        console.log(`[Auto-Claim] Claimed ${claimedCount} projects for new user ${userId}`);
      } catch (error) {
        console.error('[Auto-Claim Error]', error);
        // Don't fail registration if claim fails
      }
    }

    await conn.commit();

    const token = jwt.sign(
      { id: userId, email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(201).json({ 
      token, 
      user: { id: userId, name, email },
      claimed_projects: claimedCount
    });
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password, guest_token } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: 'Email dan password wajib diisi' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      await conn.rollback();
      return res.status(401).json({ message: 'Email atau password salah' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      await conn.rollback();
      return res.status(401).json({ message: 'Email atau password salah' });
    }

    // Check if user account is blocked (after password validation to prevent timing attacks)
    if (user.status === 'blocked') {
      await conn.rollback();
      return res.status(403).json({ message: 'Your account has been blocked. Please contact support.' });
    }

    // Auto-claim guest projects if guest_token provided
    let claimedCount = 0;
    if (guest_token) {
      try {
        const [claimResult] = await conn.query(
          `UPDATE projects 
           SET user_id = ?, guest_token = NULL, updated_at = NOW() 
           WHERE guest_token = ? AND user_id IS NULL`,
          [user.id, guest_token]
        );
        claimedCount = claimResult.affectedRows;
        console.log(`[Auto-Claim] Claimed ${claimedCount} projects for user ${user.id}`);
      } catch (error) {
        console.error('[Auto-Claim Error]', error);
        // Don't fail login if claim fails
      }
    }

    await conn.commit();

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({ 
      token, 
      user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar, role: user.role },
      claimed_projects: claimedCount
    });
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
});

// Get profile
router.get('/me', require('../middleware/auth'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query(
      'SELECT id, name, email, avatar, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'User tidak ditemukan' });
    res.json(rows[0]);
  } finally {
    conn.release();
  }
});

module.exports = router;
