/**
 * Backend ErrorTracker Integration Example
 * 
 * This file demonstrates how to integrate ErrorTracker with existing backend components
 * Copy the relevant patterns to your actual files
 */

const { createIntegratedErrorTracker, getGlobalErrorTracker } = require('./ErrorTracker');
const queryOptimizer = require('../database/QueryOptimizer');

// ==================== Example 1: App-Level Setup (app.js) ====================

/**
 * Initialize ErrorTracker at app level
 */
function initializeErrorTracking(app) {
  // Create integrated error tracker with QueryOptimizer
  const errorTracker = createIntegratedErrorTracker(queryOptimizer, {
    enableConsoleLogging: process.env.NODE_ENV === 'development',
    enableRemoteLogging: process.env.NODE_ENV === 'production',
    remoteEndpoint: process.env.ERROR_TRACKING_ENDPOINT,
    slowQueryThreshold: 1000,
    slowAPIThreshold: 2000,
    maxErrorHistory: 100,
  });

  // Add request tracking middleware
  app.use(errorTracker.middleware());

  // Add error handler middleware (must be after all routes)
  app.use(errorTracker.errorHandler());

  return errorTracker;
}

// ==================== Example 2: Products Route Integration ====================

/**
 * Integrate ErrorTracker into products route
 */
function createProductsRouteWithTracking() {
  const router = require('express').Router();
  const errorTracker = getGlobalErrorTracker();

  // GET all products
  router.get('/', async (req, res) => {
    try {
      const products = await queryOptimizer.execute(
        'SELECT * FROM products WHERE is_active = 1'
      );
      
      res.json({ data: products });
    } catch (error) {
      // Error is automatically logged by integrated ErrorTracker
      // But you can add additional context
      errorTracker.error('api', 'Failed to fetch products', error, {
        endpoint: '/api/products',
        query: req.query,
        method: 'GET',
      });
      
      res.status(500).json({ message: 'Error fetching products' });
    }
  });

  // POST create product
  router.post('/', async (req, res) => {
    try {
      // Validate input
      if (!req.body.name) {
        errorTracker.logValidationError('name', req.body.name, 'Name is required');
        return res.status(400).json({ message: 'Name is required' });
      }

      if (!req.body.price || req.body.price <= 0) {
        errorTracker.logValidationError('price', req.body.price, 'Price must be positive');
        return res.status(400).json({ message: 'Invalid price' });
      }

      const result = await queryOptimizer.execute(
        'INSERT INTO products (name, price, category, description) VALUES (?, ?, ?, ?)',
        [req.body.name, req.body.price, req.body.category, req.body.description]
      );

      errorTracker.info('api', 'Product created successfully', {
        productId: result.insertId,
        name: req.body.name,
      });

      res.status(201).json({ id: result.insertId });
    } catch (error) {
      errorTracker.logAPIError('POST', '/api/products', error, 500);
      res.status(500).json({ message: 'Error creating product' });
    }
  });

  return router;
}

// ==================== Example 3: Database Connection Pool Monitoring ====================

/**
 * Monitor database connection pool
 */
function setupConnectionPoolMonitoring(pool) {
  const errorTracker = getGlobalErrorTracker();

  // Monitor connection pool usage every 30 seconds
  setInterval(() => {
    try {
      const poolInfo = pool.pool;
      
      if (poolInfo && poolInfo._allConnections) {
        const activeConnections = poolInfo._allConnections.length;
        const maxConnections = pool.pool.config.connectionLimit || 50;
        const percentage = (activeConnections / maxConnections) * 100;

        // Log warning if pool usage is high
        if (percentage > 80) {
          errorTracker.logConnectionPoolWarning(activeConnections, maxConnections);
        }

        // Log info for monitoring
        if (process.env.NODE_ENV === 'development') {
          errorTracker.info('connection_pool', 'Pool status', {
            activeConnections,
            maxConnections,
            percentage: percentage.toFixed(2),
          });
        }
      }
    } catch (error) {
      errorTracker.error('connection_pool', 'Error monitoring connection pool', error);
    }
  }, 30000);
}

// ==================== Example 4: Memory Monitoring ====================

/**
 * Monitor server memory usage
 */
function setupMemoryMonitoring() {
  const errorTracker = getGlobalErrorTracker();

  // Monitor memory usage every 30 seconds
  setInterval(() => {
    const memoryUsage = process.memoryUsage();
    const usedMemory = memoryUsage.heapUsed;
    const totalMemory = memoryUsage.heapTotal;
    const percentage = (usedMemory / totalMemory) * 100;

    // Log warning if memory usage is high
    if (percentage > 80) {
      errorTracker.logMemoryWarning(usedMemory, totalMemory);
    }

    // Log critical if memory usage is very high
    if (percentage > 90) {
      errorTracker.critical('memory', 'Critical memory usage', null, {
        usedMemory,
        totalMemory,
        percentage: percentage.toFixed(2),
        rss: memoryUsage.rss,
        external: memoryUsage.external,
      });
    }
  }, 30000);
}

// ==================== Example 5: File Upload Error Tracking ====================

/**
 * Track file upload errors
 */
function createUploadMiddlewareWithTracking() {
  const multer = require('multer');
  const path = require('path');
  const errorTracker = getGlobalErrorTracker();

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/images');
    },
    filename: (req, file, cb) => {
      const uniqueName = `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  });

  const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|gif|webp/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);

      if (extname && mimetype) {
        cb(null, true);
      } else {
        errorTracker.logValidationError('file', file.originalname, 'Invalid file type');
        cb(new Error('Invalid file type'));
      }
    },
  });

  return (req, res, next) => {
    upload.single('image')(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            errorTracker.warning('filesystem', 'File size limit exceeded', {
              filename: req.file?.originalname,
              size: req.file?.size,
            });
            return res.status(400).json({ message: 'File too large (max 10MB)' });
          }
        }

        errorTracker.logFileSystemError('upload', req.file?.path || 'unknown', err);
        return res.status(400).json({ message: 'Upload failed' });
      }

      next();
    });
  };
}

// ==================== Example 6: Authentication Error Tracking ====================

/**
 * Track authentication errors
 */
function createAuthMiddlewareWithTracking() {
  const jwt = require('jsonwebtoken');
  const errorTracker = getGlobalErrorTracker();

  return (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      errorTracker.logAuthError('missing_token', null, req.ip, 'No token provided');
      return res.status(401).json({ message: 'Authentication required' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;

      // Log successful auth for monitoring
      errorTracker.info('authentication', 'User authenticated', {
        userId: decoded.id,
        ip: req.ip,
      });

      next();
    } catch (error) {
      const reason = error.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
      errorTracker.logAuthError('invalid_token', null, req.ip, reason);
      res.status(401).json({ message: reason });
    }
  };
}

// ==================== Example 7: Asset Optimizer Error Tracking ====================

/**
 * Track asset optimization errors
 */
async function optimizeImageWithTracking(inputPath, outputPath, options = {}) {
  const errorTracker = getGlobalErrorTracker();
  const sharp = require('sharp');

  try {
    const startTime = Date.now();

    await sharp(inputPath)
      .resize(options.width, options.height, { fit: options.fit || 'inside' })
      .webp({ quality: options.quality || 85 })
      .toFile(outputPath);

    const duration = Date.now() - startTime;

    // Log slow optimization
    if (duration > 5000) {
      errorTracker.warning('asset_optimization', `Slow image optimization: ${duration}ms`, {
        inputPath,
        outputPath,
        duration,
      });
    }

    errorTracker.info('asset_optimization', 'Image optimized successfully', {
      inputPath,
      outputPath,
      duration,
    });

    return { success: true, duration };
  } catch (error) {
    errorTracker.logFileSystemError('optimize', inputPath, error);
    throw error;
  }
}

// ==================== Example 8: Admin Monitoring Endpoint ====================

/**
 * Create admin endpoint for monitoring errors
 */
function createMonitoringRoutes() {
  const router = require('express').Router();
  const errorTracker = getGlobalErrorTracker();

  // Get error summary
  router.get('/errors/summary', (req, res) => {
    try {
      const summary = {
        totalErrors: errorTracker.getTotalErrorCount(),
        errorCount: errorTracker.getErrorCount(),
        recentErrors: errorTracker.getErrorHistory().slice(-20),
      };

      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching error summary' });
    }
  });

  // Get errors by severity
  router.get('/errors/severity/:severity', (req, res) => {
    try {
      const errors = errorTracker.getErrorsBySeverity(req.params.severity);
      res.json({ data: errors });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching errors' });
    }
  });

  // Get errors by category
  router.get('/errors/category/:category', (req, res) => {
    try {
      const errors = errorTracker.getErrorsByCategory(req.params.category);
      res.json({ data: errors });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching errors' });
    }
  });

  // Export errors as JSON
  router.get('/errors/export', (req, res) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=errors.json');
      res.send(errorTracker.exportToJSON());
    } catch (error) {
      res.status(500).json({ message: 'Error exporting errors' });
    }
  });

  // Clear error history
  router.post('/errors/clear', (req, res) => {
    try {
      errorTracker.clearHistory();
      res.json({ message: 'Error history cleared' });
    } catch (error) {
      res.status(500).json({ message: 'Error clearing history' });
    }
  });

  return router;
}

// ==================== Example 9: Slow Query Report ====================

/**
 * Generate slow query report with error tracking
 */
function generateSlowQueryReport() {
  const errorTracker = getGlobalErrorTracker();

  try {
    const slowQueries = queryOptimizer.getSlowQueries();
    const stats = queryOptimizer.getSlowQueryStats();

    const report = {
      timestamp: new Date().toISOString(),
      stats,
      queries: slowQueries,
    };

    // Log report generation
    errorTracker.info('monitoring', 'Slow query report generated', {
      queryCount: slowQueries.length,
      avgDuration: stats.avgDuration,
    });

    return report;
  } catch (error) {
    errorTracker.error('monitoring', 'Error generating slow query report', error);
    throw error;
  }
}

// ==================== Example 10: Graceful Shutdown ====================

/**
 * Handle graceful shutdown with error tracking
 */
function setupGracefulShutdown(server, pool) {
  const errorTracker = getGlobalErrorTracker();

  const shutdown = async (signal) => {
    errorTracker.info('system', `Received ${signal}, starting graceful shutdown`);

    try {
      // Close server
      await new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      errorTracker.info('system', 'Server closed');

      // Close database pool
      await pool.end();
      errorTracker.info('system', 'Database pool closed');

      // Export final error report
      const report = errorTracker.exportSummary();
      console.log('Final Error Report:', report);

      process.exit(0);
    } catch (error) {
      errorTracker.critical('system', 'Error during graceful shutdown', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// ==================== Export Examples ====================

module.exports = {
  initializeErrorTracking,
  createProductsRouteWithTracking,
  setupConnectionPoolMonitoring,
  setupMemoryMonitoring,
  createUploadMiddlewareWithTracking,
  createAuthMiddlewareWithTracking,
  optimizeImageWithTracking,
  createMonitoringRoutes,
  generateSlowQueryReport,
  setupGracefulShutdown,
};
