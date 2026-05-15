# Backend ErrorTracker Integration Guide

## Overview

ErrorTracker provides comprehensive error tracking and logging for the backend application. It integrates with QueryOptimizer to automatically log slow queries and database errors, and provides Express middleware for API request tracking.

## Features

- **Severity Levels**: info, warning, error, critical
- **Categorization**: database, api, connection_pool, memory, filesystem, authentication, validation
- **Context Tracking**: Hostname, platform, Node version, PID, memory usage, uptime
- **Stack Traces**: Automatic stack trace capture for errors
- **Global Error Handlers**: Catches uncaught exceptions and unhandled promise rejections
- **Express Middleware**: Automatic API request tracking and error logging
- **Query Integration**: Logs slow queries and database errors
- **Extensible**: Console-based now, easily extensible for Sentry/DataDog/etc

## Basic Usage

### Standalone Usage

```javascript
const { ErrorTracker } = require('./monitoring/ErrorTracker');

// Create instance
const errorTracker = new ErrorTracker({
  enableConsoleLogging: true,
  enableRemoteLogging: false,
  maxErrorHistory: 100,
  slowQueryThreshold: 1000,
  slowAPIThreshold: 2000,
});

// Log different severity levels
errorTracker.info('user_action', 'User logged in', { userId: '123' });
errorTracker.warning('validation', 'Invalid input detected', { field: 'email' });
errorTracker.error('api', 'Failed to fetch data', error, { endpoint: '/api/products' });
errorTracker.critical('system', 'Database connection lost', error);

// Specialized logging
errorTracker.logSlowQuery('SELECT * FROM products', 1500, []);
errorTracker.logDatabaseError('INSERT INTO orders', error, [userId, total]);
errorTracker.logSlowAPI('GET', '/api/products', 2500, 200);
errorTracker.logAPIError('POST', '/api/orders', error, 500);
```

### Express Middleware Integration

```javascript
const express = require('express');
const { getGlobalErrorTracker } = require('./monitoring/ErrorTracker');

const app = express();
const errorTracker = getGlobalErrorTracker();

// Add request tracking middleware (tracks all requests)
app.use(errorTracker.middleware());

// Your routes here
app.use('/api/products', require('./routes/products'));
app.use('/api/projects', require('./routes/projects'));

// Add error handler middleware (must be last)
app.use(errorTracker.errorHandler());

// Standard error handler
app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({
    message: err.message || 'Internal server error',
  });
});
```

### Integrated with QueryOptimizer

```javascript
const { createIntegratedErrorTracker } = require('./monitoring/ErrorTracker');
const queryOptimizer = require('./database/QueryOptimizer');

// Create integrated error tracker
const errorTracker = createIntegratedErrorTracker(queryOptimizer, {
  enableConsoleLogging: true,
  slowQueryThreshold: 1000,
});

// Now slow queries and database errors are automatically logged
const products = await queryOptimizer.execute(
  'SELECT * FROM products WHERE category = ?',
  ['furniture']
);
```

## Integration Examples

### Complete App Setup (app.js)

```javascript
const express = require('express');
const { getGlobalErrorTracker } = require('./monitoring/ErrorTracker');
const { createIntegratedErrorTracker } = require('./monitoring/ErrorTracker');
const queryOptimizer = require('./database/QueryOptimizer');

const app = express();

// Initialize error tracker with QueryOptimizer integration
const errorTracker = createIntegratedErrorTracker(queryOptimizer, {
  enableConsoleLogging: process.env.NODE_ENV === 'development',
  enableRemoteLogging: process.env.NODE_ENV === 'production',
  remoteEndpoint: process.env.ERROR_TRACKING_ENDPOINT,
  slowQueryThreshold: 1000,
  slowAPIThreshold: 2000,
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add error tracking middleware
app.use(errorTracker.middleware());

// Routes
app.use('/api/products', require('./routes/products'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/orders', require('./routes/orders'));

// Error handler middleware
app.use(errorTracker.errorHandler());

// Final error handler
app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({
    message: err.message || 'Internal server error',
  });
});

module.exports = app;
```

### API Route with Error Tracking

```javascript
const router = require('express').Router();
const queryOptimizer = require('../database/QueryOptimizer');
const { getGlobalErrorTracker } = require('../monitoring/ErrorTracker');

const errorTracker = getGlobalErrorTracker();

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
    });
    
    res.status(500).json({ message: 'Error fetching products' });
  }
});

router.post('/', async (req, res) => {
  try {
    // Validate input
    if (!req.body.name) {
      errorTracker.logValidationError('name', req.body.name, 'Name is required');
      return res.status(400).json({ message: 'Name is required' });
    }

    const result = await queryOptimizer.execute(
      'INSERT INTO products (name, price, category) VALUES (?, ?, ?)',
      [req.body.name, req.body.price, req.body.category]
    );

    res.status(201).json({ id: result.insertId });
  } catch (error) {
    errorTracker.logAPIError('POST', '/api/products', error, 500);
    res.status(500).json({ message: 'Error creating product' });
  }
});

module.exports = router;
```

### Connection Pool Monitoring

```javascript
const pool = require('./config/db');
const { getGlobalErrorTracker } = require('./monitoring/ErrorTracker');

const errorTracker = getGlobalErrorTracker();

// Monitor connection pool usage
setInterval(() => {
  const poolInfo = pool.pool;
  
  if (poolInfo) {
    const activeConnections = poolInfo._allConnections.length;
    const maxConnections = pool.pool.config.connectionLimit;
    const percentage = (activeConnections / maxConnections) * 100;

    if (percentage > 80) {
      errorTracker.logConnectionPoolWarning(activeConnections, maxConnections);
    }
  }
}, 30000); // Check every 30 seconds
```

### File Upload Error Tracking

```javascript
const multer = require('multer');
const { getGlobalErrorTracker } = require('../monitoring/ErrorTracker');

const errorTracker = getGlobalErrorTracker();

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
}).single('file');

router.post('/upload', (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      errorTracker.logFileSystemError('upload', req.file?.path || 'unknown', err);
      return res.status(400).json({ message: 'Upload failed' });
    }

    // Process file...
    res.json({ message: 'Upload successful' });
  });
});
```

### Authentication Error Tracking

```javascript
const jwt = require('jsonwebtoken');
const { getGlobalErrorTracker } = require('../monitoring/ErrorTracker');

const errorTracker = getGlobalErrorTracker();

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    errorTracker.logAuthError('missing_token', null, req.ip, 'No token provided');
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    errorTracker.logAuthError('invalid_token', null, req.ip, error.message);
    res.status(401).json({ message: 'Invalid token' });
  }
}

module.exports = authMiddleware;
```

### Memory Monitoring

```javascript
const { getGlobalErrorTracker } = require('./monitoring/ErrorTracker');

const errorTracker = getGlobalErrorTracker();

// Monitor memory usage
setInterval(() => {
  const memoryUsage = process.memoryUsage();
  const usedMemory = memoryUsage.heapUsed;
  const totalMemory = memoryUsage.heapTotal;
  const percentage = (usedMemory / totalMemory) * 100;

  if (percentage > 80) {
    errorTracker.logMemoryWarning(usedMemory, totalMemory);
  }
}, 30000); // Check every 30 seconds
```

## API Reference

### Constructor Options

```javascript
{
  enableConsoleLogging: true,        // Log to console (default: true)
  enableRemoteLogging: false,        // Send to remote service (default: false)
  remoteEndpoint: undefined,         // Remote logging endpoint
  maxErrorHistory: 100,              // Max errors to keep in memory (default: 100)
  slowQueryThreshold: 1000,          // Slow query threshold in ms (default: 1000)
  slowAPIThreshold: 2000,            // Slow API threshold in ms (default: 2000)
}
```

### Methods

#### Logging Methods
- `info(category, message, metadata)` - Log info message
- `warning(category, message, metadata)` - Log warning
- `error(category, message, error, metadata)` - Log error
- `critical(category, message, error, metadata)` - Log critical error

#### Specialized Methods
- `logSlowQuery(sql, duration, params)` - Log slow database query
- `logDatabaseError(sql, error, params)` - Log database error
- `logSlowAPI(method, path, duration, statusCode)` - Log slow API request
- `logAPIError(method, path, error, statusCode)` - Log API error
- `logConnectionPoolWarning(activeConnections, maxConnections)` - Log connection pool warning
- `logMemoryWarning(usedMemory, totalMemory)` - Log memory warning
- `logFileSystemError(operation, path, error)` - Log file system error
- `logAuthError(type, userId, ipAddress, reason)` - Log authentication error
- `logValidationError(field, value, reason)` - Log validation error

#### Middleware Methods
- `middleware()` - Express middleware for request tracking
- `errorHandler()` - Express error handler middleware

#### Query Methods
- `getErrorHistory()` - Get all errors
- `getErrorsBySeverity(severity)` - Get errors by severity
- `getErrorsByCategory(category)` - Get errors by category
- `getErrorCount()` - Get count by severity
- `getTotalErrorCount()` - Get total error count
- `clearHistory()` - Clear error history

#### Export Methods
- `exportToJSON()` - Export full error history to JSON
- `exportSummary()` - Export error summary to JSON

## Error Categories

- **database**: Slow queries, database errors, connection issues
- **api**: API errors, slow API calls, request failures
- **connection_pool**: Connection pool warnings, exhausted connections
- **memory**: Memory warnings, out of memory
- **filesystem**: File operations, upload errors
- **authentication**: Auth failures, invalid tokens
- **validation**: Input validation errors
- **uncaught_exception**: Global uncaught exceptions
- **unhandled_rejection**: Unhandled promise rejections

## Severity Levels

- **info**: Informational messages, validation errors
- **warning**: Non-critical issues, slow queries, slow APIs
- **error**: Errors that affect functionality
- **critical**: Critical errors that may crash the server

## Remote Logging

To enable remote logging (e.g., to Sentry, DataDog):

```javascript
const errorTracker = new ErrorTracker({
  enableRemoteLogging: true,
  remoteEndpoint: 'https://your-logging-service.com/api/errors',
});
```

The ErrorTracker will POST error entries to the endpoint in this format:

```json
{
  "id": "err_1234567890_abc123",
  "severity": "error",
  "category": "database",
  "message": "Slow query: 1500ms",
  "context": {
    "timestamp": 1715405885996,
    "hostname": "server-01",
    "platform": "linux",
    "nodeVersion": "v18.16.0",
    "pid": 12345,
    "memory": {
      "rss": 123456789,
      "heapTotal": 98765432,
      "heapUsed": 87654321
    },
    "uptime": 3600
  },
  "stackTrace": null,
  "metadata": {
    "sql": "SELECT * FROM products WHERE...",
    "duration": 1500,
    "params": ["furniture"],
    "threshold": 1000
  }
}
```

## Monitoring Dashboard Endpoint

Create an endpoint to view error statistics:

```javascript
const { getGlobalErrorTracker } = require('./monitoring/ErrorTracker');

router.get('/admin/monitoring/errors', (req, res) => {
  const errorTracker = getGlobalErrorTracker();
  
  const summary = {
    totalErrors: errorTracker.getTotalErrorCount(),
    errorCount: errorTracker.getErrorCount(),
    recentErrors: errorTracker.getErrorHistory().slice(-20),
    categoryCounts: errorTracker.getCategoryCounts(),
  };

  res.json(summary);
});

// Export errors as JSON
router.get('/admin/monitoring/errors/export', (req, res) => {
  const errorTracker = getGlobalErrorTracker();
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename=errors.json');
  res.send(errorTracker.exportToJSON());
});
```

## Best Practices

1. **Use Global Instance**: Use `getGlobalErrorTracker()` for consistency across the app
2. **Integrate Early**: Set up middleware and QueryOptimizer integration in app.js
3. **Use Middleware**: Let middleware handle automatic request tracking
4. **Categorize Properly**: Use appropriate categories for easier filtering
5. **Include Context**: Add relevant metadata to help with debugging
6. **Monitor Regularly**: Check error logs and statistics regularly
7. **Set Thresholds**: Adjust slow query and API thresholds based on your needs
8. **Export for Analysis**: Export error logs for historical analysis
9. **Clean Up**: Clear history periodically in production to prevent memory bloat
10. **Remote Logging**: Enable remote logging in production for centralized monitoring

## Performance Considerations

- Error history is kept in memory (default: 100 entries)
- Adjust `maxErrorHistory` based on your memory constraints
- Clear history periodically in long-running processes
- Remote logging is async and won't block requests
- Middleware adds minimal overhead (~1-2ms per request)

## Testing

```javascript
const { ErrorTracker } = require('./monitoring/ErrorTracker');

describe('ErrorTracker', () => {
  let errorTracker;

  beforeEach(() => {
    errorTracker = new ErrorTracker({
      enableConsoleLogging: false, // Disable for tests
    });
  });

  test('should log error', () => {
    errorTracker.error('test', 'Test error', new Error('Test'));
    expect(errorTracker.getTotalErrorCount()).toBe(1);
  });

  test('should track slow queries', () => {
    errorTracker.logSlowQuery('SELECT * FROM products', 1500, []);
    const warnings = errorTracker.getErrorsBySeverity('warning');
    expect(warnings.length).toBe(1);
    expect(warnings[0].category).toBe('database');
  });
});
```
