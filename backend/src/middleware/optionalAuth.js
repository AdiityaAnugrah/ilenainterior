const jwt = require('jsonwebtoken');
const resolveCurrentUser = require('./resolveCurrentUser');

/**
 * Optional authentication middleware
 * Supports both JWT tokens and guest tokens
 * Does not reject requests without authentication
 * 
 * Sets req.user if JWT token is valid
 * Sets req.guestToken if guest token is provided
 * Allows request to proceed even without authentication
 */
const optionalAuth = async (req, res, next) => {
  // Try JWT authentication first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
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
      console.error('[Optional Auth] Current account lookup failed:', error);
      return res.status(503).json({ message: 'Otorisasi sementara tidak tersedia' });
    }
  }

  // Check for guest token in header or query parameter
  const guestToken = req.headers['x-guest-token'] || req.query.guest_token;
  if (guestToken) {
    // Validate UUID v4 format (8-4-4-4-12 hexadecimal pattern)
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidV4Regex.test(guestToken)) {
      return res.status(400).json({ message: 'Invalid guest token format' });
    }
    req.guestToken = guestToken;
  }

  // Continue even if no authentication provided
  next();
};

module.exports = optionalAuth;
