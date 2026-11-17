const pool = require('../config/db');

module.exports = async (userId) => {
  const [rows] = await pool.query(
    'SELECT id, email, name, role, status FROM users WHERE id = ?',
    [userId]
  );
  const user = rows[0];
  if (!user || user.status !== 'active') return null;
  return user;
};
