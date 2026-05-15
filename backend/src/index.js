const app = require('./app');
const pool = require('./config/db');
const http = require('http');
const { Server } = require('socket.io');
const socketAuth = require('./middleware/socketAuth');
const NotificationService = require('./services/notificationService');

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io with CORS configuration
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Store active connections: userId -> Set of socket IDs
const activeConnections = new Map();
const MAX_CONNECTIONS_PER_USER = 5;

// Apply authentication middleware
io.use(socketAuth);

// Handle socket connections
io.on('connection', (socket) => {
  const userId = socket.userId;
  const userName = socket.userName;

  console.log(`✅ Admin connected: ${userName} (ID: ${userId}, Socket: ${socket.id})`);

  // Track connection
  if (!activeConnections.has(userId)) {
    activeConnections.set(userId, new Set());
  }

  const userSockets = activeConnections.get(userId);

  // Enforce connection limit
  if (userSockets.size >= MAX_CONNECTIONS_PER_USER) {
    // Get oldest socket and disconnect it
    const oldestSocketId = Array.from(userSockets)[0];
    const oldestSocket = io.sockets.sockets.get(oldestSocketId);
    if (oldestSocket) {
      oldestSocket.disconnect(true);
      userSockets.delete(oldestSocketId);
      console.log(`⚠️  Connection limit reached for user ${userId}, disconnected oldest socket`);
    }
  }

  userSockets.add(socket.id);

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`❌ Admin disconnected: ${userName} (Socket: ${socket.id})`);
    
    if (activeConnections.has(userId)) {
      activeConnections.get(userId).delete(socket.id);
      
      // Clean up empty sets
      if (activeConnections.get(userId).size === 0) {
        activeConnections.delete(userId);
      }
    }
  });
});

// Make io and activeConnections available to the app
app.set('io', io);
app.set('activeConnections', activeConnections);
app.set('pool', pool);

// Initialize NotificationService
const notificationService = new NotificationService(io, pool);
app.set('notificationService', notificationService);
console.log('✅ NotificationService initialized');

async function start() {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log('✅ Database terhubung');

    server.listen(PORT, () => {
      console.log(`🚀 ILENA INTERIOR API berjalan di http://localhost:${PORT}`);
      console.log(`🔌 Socket.io server ready for admin notifications`);
    });
  } catch (err) {
    console.error('❌ Gagal terhubung ke database:', err.message);
    process.exit(1);
  }
}

start();
