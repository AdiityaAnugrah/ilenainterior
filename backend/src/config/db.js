const mysql = require('mysql2/promise');
require('dotenv').config();

// Create connection pool with optimal settings for concurrent users
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  
  // Connection pool settings
  connectionLimit: 50,        // Maximum 50 concurrent connections
  waitForConnections: true,   // Wait for available connection instead of throwing error
  queueLimit: 0,              // Unlimited queue (no limit on waiting requests)
  
  // Keep-alive settings to prevent connection drops
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  
  // Connection timeout settings
  connectTimeout: 10000,      // 10 seconds timeout for initial connection
  
  // Additional performance settings
  multipleStatements: false,  // Security: prevent SQL injection via multiple statements
  dateStrings: false,         // Return dates as Date objects
  supportBigNumbers: true,    // Support for BIGINT columns
  bigNumberStrings: false,    // Return BIGINT as numbers (not strings) when safe
});

// Connection pool event handlers for monitoring and debugging
pool.on('acquire', (connection) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DB Pool] Connection ${connection.threadId} acquired`);
  }
});

pool.on('connection', (connection) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DB Pool] New connection ${connection.threadId} created`);
  }
});

pool.on('enqueue', () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('[DB Pool] Waiting for available connection slot');
  }
});

pool.on('release', (connection) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DB Pool] Connection ${connection.threadId} released`);
  }
});

// Error handling for pool errors
pool.on('error', (err) => {
  console.error('[DB Pool] Unexpected error on idle client', err);
  
  // Log pool stats on error for debugging
  try {
    const stats = {
      totalConnections: pool.pool._allConnections.length,
      activeConnections: pool.pool._allConnections.length - pool.pool._freeConnections.length,
      idleConnections: pool.pool._freeConnections.length,
      queuedRequests: pool.pool._connectionQueue.length,
    };
    console.error('[DB Pool] Pool state at error:', stats);
  } catch (statErr) {
    console.error('[DB Pool] Could not retrieve pool stats:', statErr.message);
  }
  
  process.exit(-1);
});

// Graceful shutdown handler
process.on('SIGINT', async () => {
  console.log('[DB Pool] Closing connection pool...');
  try {
    await pool.end();
    console.log('[DB Pool] Connection pool closed successfully');
    process.exit(0);
  } catch (err) {
    console.error('[DB Pool] Error closing connection pool:', err);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('[DB Pool] Closing connection pool...');
  try {
    await pool.end();
    console.log('[DB Pool] Connection pool closed successfully');
    process.exit(0);
  } catch (err) {
    console.error('[DB Pool] Error closing connection pool:', err);
    process.exit(1);
  }
});

// Function to get pool statistics
function getPoolStats() {
  const poolConfig = pool.pool.config.connectionConfig;
  const poolState = pool.pool;
  
  return {
    totalConnections: poolState._allConnections.length,
    activeConnections: poolState._allConnections.length - poolState._freeConnections.length,
    idleConnections: poolState._freeConnections.length,
    queuedRequests: poolState._connectionQueue.length,
    maxConnections: pool.pool.config.connectionLimit,
    waitForConnections: pool.pool.config.waitForConnections,
    queueLimit: pool.pool.config.queueLimit,
  };
}

// Function to log pool statistics
function logPoolStats() {
  const stats = getPoolStats();
  console.log('[DB Pool] Statistics:', {
    total: stats.totalConnections,
    active: stats.activeConnections,
    idle: stats.idleConnections,
    queued: stats.queuedRequests,
    max: stats.maxConnections,
  });
}

// Periodic pool statistics logging (every 5 minutes in production)
if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    logPoolStats();
  }, 5 * 60 * 1000); // 5 minutes
}

// Test connection on startup
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('[DB Pool] Database connection pool initialized successfully');
    console.log(`[DB Pool] Configuration: max=50, waitForConnections=true, queueLimit=0 (unlimited)`);
    console.log(`[DB Pool] Timeouts: connect=10s`);
    connection.release();
    
    // Log initial stats
    logPoolStats();
  } catch (err) {
    console.error('[DB Pool] Failed to initialize database connection pool:', err);
    process.exit(1);
  }
})();

// Export pool and utility functions
module.exports = pool;
module.exports.getPoolStats = getPoolStats;
module.exports.logPoolStats = logPoolStats;
