const jwt = require('jsonwebtoken');
const pool = require('../config/db');

module.exports = (...allowedRoles) => async (req, res, next) => {
  const header = req.get('authorization') || '';
  if (!header.startsWith('Bearer ')) return res.status(401).json({ message: 'Tidak terautentikasi' });
  try {
    const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    const [rows] = await pool.query('SELECT role, status FROM users WHERE id = ?', [decoded.id]);
    const user = rows[0];
    if (!user || user.status === 'blocked' || !allowedRoles.includes(user.role)) {
      return res.status(403).json({ message: 'Akses ditolak' });
    }
    req.user = { ...decoded, role: user.role };
    next();
  } catch { return res.status(403).json({ message: 'Token tidak valid' }); }
};
