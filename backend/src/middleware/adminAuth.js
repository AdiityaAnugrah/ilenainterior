const jwt  = require('jsonwebtoken');
const pool = require('../config/db');

module.exports = async (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Tidak terautentikasi' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const conn = await pool.getConnection();
    const [rows] = await conn.query('SELECT role FROM users WHERE id = ?', [decoded.id]);
    conn.release();

    if (!rows.length || rows[0].role !== 'admin') {
      return res.status(403).json({ message: 'Akses ditolak — hanya admin' });
    }
    req.user = decoded;
    next();
  } catch {
    res.status(403).json({ message: 'Token tidak valid' });
  }
};
