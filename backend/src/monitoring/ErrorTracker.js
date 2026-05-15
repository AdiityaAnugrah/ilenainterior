/**
 * ErrorTracker - Backend error tracking and logging for monitoring service
 * 
 * Logs performance warnings, slow database queries, API errors, and other issues
 * Categorizes errors by severity and includes context (request info, timestamp)
 * Console-based for now, extensible for Sentry/DataDog/etc
 */

class ErrorTracker {
  constructor(config = {}) {
    this.config = {
      enableConsoleLogging: config.enableConsoleLogging ?? true,
      enableRemoteLogging: config.enableRemoteLogging ?? false,
      remoteEndpoint: config.remoteEndpoint,
      maxErrorHistory: config.maxErrorHistory ?? 100,
      slowQueryThreshold: config.slowQueryThreshold ?? 1000, // 1 second
      slowAPIThreshold: config.slowAPIThreshold ?? 2000, // 2 seconds
    };

    this.errorHistory = [];
    this.errorCount = {
      info: 0,
      warning: 0,
      error: 0,
      critical: 0,
    };

    // Set up global error handlers
    this.setupGlobalErrorHandlers();
  }

  // ==================== Error Logging Methods ====================

  /**
   * Log an info message
   */
  info(category, message, metadata = {}) {
    this.logError('info', category, message, null, metadata);
  }

  /**
   * Log a warning
   */
  warning(category, message, metadata = {}) {
    this.logError('warning', category, message, null, metadata);
  }

  /**
   * Log an error
   */
  error(category, message, error = null, metadata = {}) {
    const stackTrace = error?.stack;
    this.logError('error', category, message, stackTrace, metadata);
  }

  /**
   * Log a critical error
   */
  critical(category, message, error = null, metadata = {}) {
    const stackTrace = error?.stack;
    this.logError('critical', category, message, stackTrace, metadata);
  }

  // ==================== Specialized Logging Methods ====================

  /**
   * Log slow database query
   */
  logSlowQuery(sql, duration, params = []) {
    this.warning('database', `Slow query: ${duration}ms`, {
      sql: this.sanitizeSQL(sql),
      duration,
      params: this.sanitizeParams(params),
      threshold: this.config.slowQueryThreshold,
    });
  }

  /**
   * Log database error
   */
  logDatabaseError(sql, error, params = []) {
    this.error('database', `Database error: ${error.message}`, error, {
      sql: this.sanitizeSQL(sql),
      params: this.sanitizeParams(params),
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
    });
  }

  /**
   * Log slow API request
   */
  logSlowAPI(method, path, duration, statusCode) {
    this.warning('api', `Slow API request: ${method} ${path} took ${duration}ms`, {
      method,
      path,
      duration,
      statusCode,
      threshold: this.config.slowAPIThreshold,
    });
  }

  /**
   * Log API error
   */
  logAPIError(method, path, error, statusCode = 500) {
    this.error('api', `API error: ${method} ${path}`, error, {
      method,
      path,
      statusCode,
      errorMessage: error.message,
    });
  }

  /**
   * Log connection pool warning
   */
  logConnectionPoolWarning(activeConnections, maxConnections) {
    const percentage = Math.round((activeConnections / maxConnections) * 100);
    this.warning('connection_pool', `High connection pool usage: ${activeConnections}/${maxConnections} (${percentage}%)`, {
      activeConnections,
      maxConnections,
      percentage,
    });
  }

  /**
   * Log memory warning
   */
  logMemoryWarning(usedMemory, totalMemory) {
    const percentage = Math.round((usedMemory / totalMemory) * 100);
    this.warning('memory', `High memory usage: ${this.formatBytes(usedMemory)} / ${this.formatBytes(totalMemory)} (${percentage}%)`, {
      usedMemory,
      totalMemory,
      percentage,
    });
  }

  /**
   * Log file system error
   */
  logFileSystemError(operation, path, error) {
    this.error('filesystem', `File system error during ${operation}: ${path}`, error, {
      operation,
      path,
      code: error.code,
    });
  }

  /**
   * Log authentication error
   */
  logAuthError(type, userId, ipAddress, reason) {
    this.warning('authentication', `Authentication ${type}: ${reason}`, {
      type,
      userId,
      ipAddress,
      reason,
    });
  }

  /**
   * Log validation error
   */
  logValidationError(field, value, reason) {
    this.info('validation', `Validation error: ${field}`, {
      field,
      value: this.sanitizeValue(value),
      reason,
    });
  }

  // ==================== Core Logging Method ====================

  /**
   * Core method to log an error
   */
  logError(severity, category, message, stackTrace = null, metadata = {}) {
    const errorEntry = {
      id: this.generateErrorId(),
      severity,
      category,
      message,
      context: this.getContext(),
      stackTrace,
      metadata,
    };

    // Add to history
    this.errorHistory.push(errorEntry);
    if (this.errorHistory.length > this.config.maxErrorHistory) {
      this.errorHistory.shift();
    }

    // Update count
    this.errorCount[severity]++;

    // Console logging
    if (this.config.enableConsoleLogging) {
      this.logToConsole(errorEntry);
    }

    // Remote logging (if enabled)
    if (this.config.enableRemoteLogging && this.config.remoteEndpoint) {
      this.sendToRemote(errorEntry);
    }
  }

  // ==================== Global Error Handlers ====================

  /**
   * Set up global error handlers for uncaught errors
   */
  setupGlobalErrorHandlers() {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.critical('uncaught_exception', `Uncaught Exception: ${error.message}`, error);
      // Don't exit process, let the application decide
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.critical(
        'unhandled_rejection',
        `Unhandled Promise Rejection: ${reason}`,
        reason instanceof Error ? reason : null,
        {
          reason: String(reason),
        }
      );
    });
  }

  // ==================== Express Middleware ====================

  /**
   * Express middleware for tracking API requests and errors
   */
  middleware() {
    return (req, res, next) => {
      const startTime = Date.now();

      // Store original end function
      const originalEnd = res.end;

      // Override end function to track response time
      res.end = (...args) => {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;

        // Log slow API requests
        if (duration > this.config.slowAPIThreshold) {
          this.logSlowAPI(req.method, req.path, duration, statusCode);
        }

        // Log API errors (4xx and 5xx)
        if (statusCode >= 400) {
          const severity = statusCode >= 500 ? 'error' : 'warning';
          this.logError(severity, 'api', `${req.method} ${req.path} returned ${statusCode}`, null, {
            method: req.method,
            path: req.path,
            statusCode,
            duration,
            query: req.query,
            ip: req.ip,
            userAgent: req.get('user-agent'),
          });
        }

        // Call original end function
        return originalEnd.apply(res, args);
      };

      next();
    };
  }

  /**
   * Express error handler middleware
   */
  errorHandler() {
    return (err, req, res, next) => {
      // Log the error
      this.logAPIError(req.method, req.path, err, err.statusCode || 500);

      // Pass to next error handler
      next(err);
    };
  }

  // ==================== Context Methods ====================

  /**
   * Get current context information
   */
  getContext() {
    const context = {
      timestamp: Date.now(),
      hostname: require('os').hostname(),
      platform: process.platform,
      nodeVersion: process.version,
      pid: process.pid,
      memory: process.memoryUsage(),
      uptime: process.uptime(),
    };

    return context;
  }

  // ==================== Output Methods ====================

  /**
   * Log error to console with appropriate styling
   */
  logToConsole(entry) {
    const timestamp = new Date(entry.context.timestamp).toISOString();
    const prefix = `[ErrorTracker] [${timestamp}] [${entry.severity.toUpperCase()}] [${entry.category}]`;

    switch (entry.severity) {
      case 'info':
        console.log(`${prefix} ${entry.message}`, entry.metadata || '');
        break;
      case 'warning':
        console.warn(`${prefix} ${entry.message}`, entry.metadata || '');
        break;
      case 'error':
        console.error(`${prefix} ${entry.message}`, entry.metadata || '');
        if (entry.stackTrace) {
          console.error('Stack trace:', entry.stackTrace);
        }
        break;
      case 'critical':
        console.error(`${prefix} ${entry.message}`, entry.metadata || '');
        if (entry.stackTrace) {
          console.error('Stack trace:', entry.stackTrace);
        }
        console.error('Context:', entry.context);
        break;
    }
  }

  /**
   * Send error to remote monitoring service
   */
  async sendToRemote(entry) {
    if (!this.config.remoteEndpoint) return;

    try {
      const fetch = (await import('node-fetch')).default;
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry),
      });
    } catch (error) {
      // Silently fail to avoid infinite error loops
      console.error('Failed to send error to remote service:', error.message);
    }
  }

  // ==================== Query Methods ====================

  /**
   * Get error history
   */
  getErrorHistory() {
    return [...this.errorHistory];
  }

  /**
   * Get errors by severity
   */
  getErrorsBySeverity(severity) {
    return this.errorHistory.filter((entry) => entry.severity === severity);
  }

  /**
   * Get errors by category
   */
  getErrorsByCategory(category) {
    return this.errorHistory.filter((entry) => entry.category === category);
  }

  /**
   * Get error count by severity
   */
  getErrorCount() {
    return { ...this.errorCount };
  }

  /**
   * Get total error count
   */
  getTotalErrorCount() {
    return Object.values(this.errorCount).reduce((sum, count) => sum + count, 0);
  }

  /**
   * Clear error history
   */
  clearHistory() {
    this.errorHistory = [];
    this.errorCount = {
      info: 0,
      warning: 0,
      error: 0,
      critical: 0,
    };
  }

  // ==================== Export Methods ====================

  /**
   * Export error history to JSON
   */
  exportToJSON() {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        totalErrors: this.getTotalErrorCount(),
        errorCount: this.errorCount,
        errors: this.errorHistory,
      },
      null,
      2
    );
  }

  /**
   * Export error summary
   */
  exportSummary() {
    const summary = {
      totalErrors: this.getTotalErrorCount(),
      errorCount: this.errorCount,
      categoryCounts: this.getCategoryCounts(),
      recentErrors: this.errorHistory.slice(-10),
    };

    return JSON.stringify(summary, null, 2);
  }

  /**
   * Get error counts by category
   */
  getCategoryCounts() {
    const counts = {};

    for (const entry of this.errorHistory) {
      counts[entry.category] = (counts[entry.category] || 0) + 1;
    }

    return counts;
  }

  // ==================== Utility Methods ====================

  /**
   * Generate unique error ID
   */
  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Format bytes to human-readable string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Sanitize SQL query for logging (remove sensitive data)
   */
  sanitizeSQL(sql) {
    if (!sql) return '';
    // Truncate very long queries
    if (sql.length > 500) {
      return sql.substring(0, 500) + '... [truncated]';
    }
    return sql;
  }

  /**
   * Sanitize query parameters for logging (remove sensitive data)
   */
  sanitizeParams(params) {
    if (!Array.isArray(params)) return [];
    
    return params.map((param) => {
      // Mask potential passwords or sensitive data
      if (typeof param === 'string' && param.length > 50) {
        return param.substring(0, 50) + '... [truncated]';
      }
      return param;
    });
  }

  /**
   * Sanitize value for logging
   */
  sanitizeValue(value) {
    if (typeof value === 'string' && value.length > 100) {
      return value.substring(0, 100) + '... [truncated]';
    }
    return value;
  }
}

// ==================== Integration Helper ====================

/**
 * Create ErrorTracker integrated with QueryOptimizer
 */
function createIntegratedErrorTracker(queryOptimizer, config = {}) {
  const tracker = new ErrorTracker(config);

  // If query optimizer is provided, set up integration
  if (queryOptimizer) {
    // Override logSlowQuery method to use ErrorTracker
    const originalLogSlowQuery = queryOptimizer.logSlowQuery?.bind(queryOptimizer);
    if (originalLogSlowQuery) {
      queryOptimizer.logSlowQuery = function (sql, duration, params) {
        originalLogSlowQuery(sql, duration, params);
        tracker.logSlowQuery(sql, duration, params);
      };
    }

    // Add error tracking to execute method
    const originalExecute = queryOptimizer.execute?.bind(queryOptimizer);
    if (originalExecute) {
      queryOptimizer.execute = async function (sql, params = []) {
        try {
          return await originalExecute(sql, params);
        } catch (error) {
          tracker.logDatabaseError(sql, error, params);
          throw error;
        }
      };
    }
  }

  return tracker;
}

// ==================== Singleton Instance ====================

let globalErrorTracker = null;

/**
 * Get global ErrorTracker instance
 */
function getGlobalErrorTracker(config = {}) {
  if (!globalErrorTracker) {
    globalErrorTracker = new ErrorTracker(config);
  }
  return globalErrorTracker;
}

/**
 * Reset global ErrorTracker instance
 */
function resetGlobalErrorTracker() {
  globalErrorTracker = null;
}

module.exports = {
  ErrorTracker,
  createIntegratedErrorTracker,
  getGlobalErrorTracker,
  resetGlobalErrorTracker,
};
