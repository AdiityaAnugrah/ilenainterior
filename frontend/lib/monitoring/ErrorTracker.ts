/**
 * ErrorTracker - Error tracking and logging for monitoring service
 * 
 * Logs performance warnings, JavaScript errors, slow API calls, and other issues
 * Categorizes errors by severity and includes context (user agent, URL, timestamp)
 * Console-based for now, extensible for Sentry/DataDog/etc
 */

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface ErrorContext {
  userAgent: string;
  url: string;
  timestamp: number;
  sessionId?: string;
  userId?: string;
  additionalData?: Record<string, any>;
}

export interface ErrorEntry {
  id: string;
  severity: ErrorSeverity;
  category: string;
  message: string;
  context: ErrorContext;
  stackTrace?: string;
  metadata?: Record<string, any>;
}

export interface ErrorTrackerConfig {
  enableConsoleLogging: boolean;
  enableRemoteLogging: boolean;
  remoteEndpoint?: string;
  maxErrorHistory: number;
  sessionId?: string;
  userId?: string;
}

const DEFAULT_CONFIG: ErrorTrackerConfig = {
  enableConsoleLogging: true,
  enableRemoteLogging: false,
  maxErrorHistory: 100,
};

export class ErrorTracker {
  private config: ErrorTrackerConfig;
  private errorHistory: ErrorEntry[];
  private errorCount: Record<ErrorSeverity, number>;

  constructor(config?: Partial<ErrorTrackerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
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
  info(category: string, message: string, metadata?: Record<string, any>): void {
    this.logError('info', category, message, undefined, metadata);
  }

  /**
   * Log a warning
   */
  warning(category: string, message: string, metadata?: Record<string, any>): void {
    this.logError('warning', category, message, undefined, metadata);
  }

  /**
   * Log an error
   */
  error(category: string, message: string, error?: Error, metadata?: Record<string, any>): void {
    const stackTrace = error?.stack;
    this.logError('error', category, message, stackTrace, metadata);
  }

  /**
   * Log a critical error
   */
  critical(category: string, message: string, error?: Error, metadata?: Record<string, any>): void {
    const stackTrace = error?.stack;
    this.logError('critical', category, message, stackTrace, metadata);
  }

  // ==================== Specialized Logging Methods ====================

  /**
   * Log performance warning (low FPS, high memory, etc)
   */
  logPerformanceWarning(type: 'low_fps' | 'high_memory' | 'slow_render', details: Record<string, any>): void {
    const messages = {
      low_fps: `Low FPS detected: ${details.fps} FPS`,
      high_memory: `High memory usage: ${details.percentage}%`,
      slow_render: `Slow render detected: ${details.duration}ms`,
    };

    this.warning('performance', messages[type], details);
  }

  /**
   * Log slow API call
   */
  logSlowAPI(endpoint: string, duration: number, threshold: number): void {
    this.warning('api', `Slow API call: ${endpoint} took ${duration}ms (threshold: ${threshold}ms)`, {
      endpoint,
      duration,
      threshold,
    });
  }

  /**
   * Log JavaScript error with stack trace
   */
  logJavaScriptError(error: Error, context?: string): void {
    this.error(
      'javascript',
      context ? `${context}: ${error.message}` : error.message,
      error,
      {
        errorName: error.name,
        context,
      }
    );
  }

  /**
   * Log network error
   */
  logNetworkError(endpoint: string, statusCode?: number, errorMessage?: string): void {
    this.error('network', `Network error: ${endpoint}`, undefined, {
      endpoint,
      statusCode,
      errorMessage,
    });
  }

  /**
   * Log asset loading error
   */
  logAssetLoadError(assetUrl: string, assetType: string, error?: Error): void {
    this.error('asset_loading', `Failed to load ${assetType}: ${assetUrl}`, error, {
      assetUrl,
      assetType,
    });
  }

  /**
   * Log WebGL error
   */
  logWebGLError(message: string, details?: Record<string, any>): void {
    this.error('webgl', message, undefined, details);
  }

  /**
   * Log memory warning
   */
  logMemoryWarning(usedMemory: number, totalMemory: number, percentage: number): void {
    this.warning('memory', `Memory usage: ${this.formatBytes(usedMemory)} / ${this.formatBytes(totalMemory)} (${percentage}%)`, {
      usedMemory,
      totalMemory,
      percentage,
    });
  }

  // ==================== Core Logging Method ====================

  /**
   * Core method to log an error
   */
  private logError(
    severity: ErrorSeverity,
    category: string,
    message: string,
    stackTrace?: string,
    metadata?: Record<string, any>
  ): void {
    const errorEntry: ErrorEntry = {
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
  private setupGlobalErrorHandlers(): void {
    // Handle uncaught JavaScript errors
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.error(
          'uncaught_error',
          event.message,
          event.error,
          {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
          }
        );
      });

      // Handle unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.error(
          'unhandled_rejection',
          `Unhandled Promise Rejection: ${event.reason}`,
          event.reason instanceof Error ? event.reason : undefined,
          {
            reason: String(event.reason),
          }
        );
      });
    }
  }

  // ==================== Context Methods ====================

  /**
   * Get current context information
   */
  private getContext(): ErrorContext {
    const context: ErrorContext = {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      timestamp: Date.now(),
    };

    if (this.config.sessionId) {
      context.sessionId = this.config.sessionId;
    }

    if (this.config.userId) {
      context.userId = this.config.userId;
    }

    return context;
  }

  /**
   * Set user ID for context
   */
  setUserId(userId: string): void {
    this.config.userId = userId;
  }

  /**
   * Set session ID for context
   */
  setSessionId(sessionId: string): void {
    this.config.sessionId = sessionId;
  }

  // ==================== Output Methods ====================

  /**
   * Log error to console with appropriate styling
   */
  private logToConsole(entry: ErrorEntry): void {
    const timestamp = new Date(entry.context.timestamp).toISOString();
    const prefix = `[ErrorTracker] [${entry.severity.toUpperCase()}] [${entry.category}]`;

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
  private async sendToRemote(entry: ErrorEntry): Promise<void> {
    if (!this.config.remoteEndpoint) return;

    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry),
      });
    } catch (error) {
      // Silently fail to avoid infinite error loops
      console.error('Failed to send error to remote service:', error);
    }
  }

  // ==================== Query Methods ====================

  /**
   * Get error history
   */
  getErrorHistory(): ErrorEntry[] {
    return [...this.errorHistory];
  }

  /**
   * Get errors by severity
   */
  getErrorsBySeverity(severity: ErrorSeverity): ErrorEntry[] {
    return this.errorHistory.filter((entry) => entry.severity === severity);
  }

  /**
   * Get errors by category
   */
  getErrorsByCategory(category: string): ErrorEntry[] {
    return this.errorHistory.filter((entry) => entry.category === category);
  }

  /**
   * Get error count by severity
   */
  getErrorCount(): Record<ErrorSeverity, number> {
    return { ...this.errorCount };
  }

  /**
   * Get total error count
   */
  getTotalErrorCount(): number {
    return Object.values(this.errorCount).reduce((sum, count) => sum + count, 0);
  }

  /**
   * Clear error history
   */
  clearHistory(): void {
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
  exportToJSON(): string {
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
  exportSummary(): string {
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
  private getCategoryCounts(): Record<string, number> {
    const counts: Record<string, number> = {};

    for (const entry of this.errorHistory) {
      counts[entry.category] = (counts[entry.category] || 0) + 1;
    }

    return counts;
  }

  // ==================== Utility Methods ====================

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}

// ==================== Integration Helper ====================

/**
 * Create ErrorTracker integrated with PerformanceMonitor
 */
export function createIntegratedErrorTracker(
  performanceMonitor?: any,
  config?: Partial<ErrorTrackerConfig>
): ErrorTracker {
  const tracker = new ErrorTracker(config);

  // If performance monitor is provided, set up integration
  if (performanceMonitor) {
    // Monitor FPS warnings
    const originalUpdateFPS = performanceMonitor.updateFPS?.bind(performanceMonitor);
    if (originalUpdateFPS) {
      performanceMonitor.updateFPS = function (currentTime?: number) {
        originalUpdateFPS(currentTime);
        const fps = performanceMonitor.getFPS();
        if (fps < 30 && fps > 0) {
          tracker.logPerformanceWarning('low_fps', { fps });
        }
      };
    }

    // Monitor memory warnings
    const originalCheckMemoryWarning = performanceMonitor.checkMemoryWarning?.bind(performanceMonitor);
    if (originalCheckMemoryWarning) {
      const checkInterval = setInterval(() => {
        if (originalCheckMemoryWarning()) {
          const memoryUsage = performanceMonitor.getMemoryUsage();
          tracker.logMemoryWarning(
            memoryUsage.usedJSHeapSize,
            memoryUsage.jsHeapSizeLimit,
            memoryUsage.percentage
          );
        }
      }, 10000); // Check every 10 seconds

      // Store interval ID for cleanup
      (tracker as any)._memoryCheckInterval = checkInterval;
    }

    // Monitor API latency warnings
    const originalTrackAPICall = performanceMonitor.trackAPICall?.bind(performanceMonitor);
    if (originalTrackAPICall) {
      performanceMonitor.trackAPICall = function (endpoint: string, duration: number) {
        originalTrackAPICall(endpoint, duration);
        const threshold = 2000; // 2 seconds
        if (duration > threshold) {
          tracker.logSlowAPI(endpoint, duration, threshold);
        }
      };
    }
  }

  return tracker;
}

// ==================== Singleton Instance ====================

let globalErrorTracker: ErrorTracker | null = null;

/**
 * Get global ErrorTracker instance
 */
export function getGlobalErrorTracker(config?: Partial<ErrorTrackerConfig>): ErrorTracker {
  if (!globalErrorTracker) {
    globalErrorTracker = new ErrorTracker(config);
  }
  return globalErrorTracker;
}

/**
 * Reset global ErrorTracker instance
 */
export function resetGlobalErrorTracker(): void {
  if (globalErrorTracker) {
    // Cleanup memory check interval if exists
    const interval = (globalErrorTracker as any)._memoryCheckInterval;
    if (interval) {
      clearInterval(interval);
    }
    globalErrorTracker = null;
  }
}
