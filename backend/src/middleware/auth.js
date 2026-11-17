const jwt = require('jsonwebtoken');
const resolveCurrentUser = require('./resolveCurrentUser');

module.exports = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Token tidak ditemukan' });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(403).json({ message: 'Token tidak valid' });
  }
  if (!decoded.id) return res.status(403).json({ message: 'Token tidak valid' });

  try {
    const currentUser = await resolveCurrentUser(decoded.id);
    if (!currentUser) return res.status(403).json({ message: 'Akun tidak aktif' });
    req.user = { ...decoded, ...currentUser };
    return next();
  } catch (error) {
    console.error('[Auth] Current account lookup failed:', error);
    return res.status(503).json({ message: 'Otorisasi sementara tidak tersedia' });
  }
};
