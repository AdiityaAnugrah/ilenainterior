const jwt = require('jsonwebtoken');

/**
 * Socket.io authentication middleware
 * Verifies JWT token from socket handshake and ensures user is an admin
 */
const socketAuth = async (socket, next) => {
  try {
    // Extract token from handshake auth or query
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || !decoded.id) {
      return next(new Error('Invalid token'));
    }

    // Verify user role is admin
    if (decoded.role !== 'admin') {
      return next(new Error('Admin access required'));
    }

    // Attach user info to socket
    socket.userId = decoded.id;
    socket.userRole = decoded.role;
    socket.userName = decoded.name || 'Admin';

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new Error('Invalid token'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new Error('Token expired'));
    }
    return next(new Error('Authentication failed'));
  }
};

module.exports = socketAuth;
