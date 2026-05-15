/**
 * ErrorTracker Integration Example
 * 
 * This file demonstrates how to integrate ErrorTracker with existing components
 * Copy the relevant patterns to your actual components
 */

import { getGlobalPerformanceMonitor } from '../performance/PerformanceMonitor';
import { createIntegratedErrorTracker, getGlobalErrorTracker } from './ErrorTracker';

// ==================== Example 1: App-Level Setup ====================

/**
 * Initialize ErrorTracker at app level (in _app.tsx or layout.tsx)
 */
export function initializeErrorTracking() {
  // Get performance monitor
  const performanceMonitor = getGlobalPerformanceMonitor({
    enableFPSTracking: true,
    enableMemoryTracking: true,
    enableAPITracking: true,
    fpsWarningThreshold: 30,
    memoryWarningThreshold: 80,
    apiLatencyWarningThreshold: 2000,
  });

  // Create integrated error tracker
  const errorTracker = createIntegratedErrorTracker(performanceMonitor, {
    enableConsoleLogging: process.env.NODE_ENV === 'development',
    enableRemoteLogging: process.env.NODE_ENV === 'production',
    remoteEndpoint: process.env.NEXT_PUBLIC_ERROR_TRACKING_ENDPOINT,
    maxErrorHistory: 100,
  });

  // Set session ID
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  errorTracker.setSessionId(sessionId);

  // Start monitoring
  performanceMonitor.startFPSTracking();
  performanceMonitor.startMemoryTracking();

  return { performanceMonitor, errorTracker };
}

// ==================== Example 2: Canvas3D Integration ====================

/**
 * Integrate ErrorTracker into Canvas3D component
 */
export function useCanvas3DErrorTracking() {
  const errorTracker = getGlobalErrorTracker();

  // Track WebGL context creation
  const handleWebGLContextCreation = (gl: WebGLRenderingContext | null) => {
    if (!gl) {
      errorTracker.critical('webgl', 'Failed to create WebGL context');
      return false;
    }
    return true;
  };

  // Track WebGL errors
  const handleWebGLError = (error: Error) => {
    errorTracker.logWebGLError(error.message, {
      errorName: error.name,
      stack: error.stack,
    });
  };

  // Track rendering errors
  const handleRenderError = (error: Error) => {
    errorTracker.error('rendering', 'Render error in Canvas3D', error, {
      component: 'Canvas3D',
    });
  };

  return {
    handleWebGLContextCreation,
    handleWebGLError,
    handleRenderError,
  };
}

// ==================== Example 3: Asset Loading Integration ====================

/**
 * Integrate ErrorTracker into asset loading
 */
export function useAssetLoadingErrorTracking() {
  const errorTracker = getGlobalErrorTracker();

  // Track model loading
  const trackModelLoad = async (url: string, loadFn: () => Promise<any>) => {
    const startTime = performance.now();

    try {
      const result = await loadFn();
      const duration = performance.now() - startTime;

      // Log slow loads
      if (duration > 3000) {
        errorTracker.warning('asset_loading', `Slow model load: ${url} took ${duration}ms`, {
          url,
          duration,
          type: 'model',
        });
      }

      return result;
    } catch (error) {
      errorTracker.logAssetLoadError(url, 'model', error as Error);
      throw error;
    }
  };

  // Track texture loading
  const trackTextureLoad = async (url: string, loadFn: () => Promise<any>) => {
    try {
      return await loadFn();
    } catch (error) {
      errorTracker.logAssetLoadError(url, 'texture', error as Error);
      throw error;
    }
  };

  return {
    trackModelLoad,
    trackTextureLoad,
  };
}

// ==================== Example 4: API Client Integration ====================

/**
 * Integrate ErrorTracker into API client
 */
export function createTrackedFetch() {
  const errorTracker = getGlobalErrorTracker();
  const performanceMonitor = getGlobalPerformanceMonitor();

  return async function trackedFetch(url: string, options?: RequestInit) {
    const startTime = performance.now();

    try {
      const response = await fetch(url, options);
      const duration = performance.now() - startTime;

      // Track API latency
      performanceMonitor.trackAPICall(url, duration);

      // Log slow API calls
      if (duration > 2000) {
        errorTracker.logSlowAPI(url, duration, 2000);
      }

      // Log HTTP errors
      if (!response.ok) {
        errorTracker.logNetworkError(url, response.status, response.statusText);
      }

      return response;
    } catch (error) {
      const duration = performance.now() - startTime;
      errorTracker.logNetworkError(url, undefined, (error as Error).message);
      throw error;
    }
  };
}

// ==================== Example 5: Memory Manager Integration ====================

/**
 * Integrate ErrorTracker with MemoryManager
 */
export function setupMemoryManagerErrorTracking(memoryManager: any) {
  const errorTracker = getGlobalErrorTracker();

  // Monitor memory usage periodically
  const monitorInterval = setInterval(() => {
    const stats = memoryManager.getStats();
    const percentage = (stats.totalMemoryUsage / stats.maxMemoryUsage) * 100;

    if (percentage > 80) {
      errorTracker.logMemoryWarning(
        stats.totalMemoryUsage * 1024 * 1024, // Convert MB to bytes
        stats.maxMemoryUsage * 1024 * 1024,
        percentage
      );
    }
  }, 10000); // Check every 10 seconds

  // Return cleanup function
  return () => clearInterval(monitorInterval);
}

// ==================== Example 6: Component Error Boundary ====================

/**
 * Error boundary with ErrorTracker integration
 */
export class ErrorBoundaryWithTracking extends Error {
  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    const errorTracker = getGlobalErrorTracker();
    
    errorTracker.error(
      'react_error_boundary',
      `Component error: ${error.message}`,
      error,
      {
        componentStack: errorInfo.componentStack,
      }
    );
  }
}

// ==================== Example 7: User Action Tracking ====================

/**
 * Track user actions that might cause errors
 */
export function useUserActionTracking() {
  const errorTracker = getGlobalErrorTracker();

  const trackAction = (action: string, metadata?: Record<string, any>) => {
    errorTracker.info('user_action', action, metadata);
  };

  const trackError = (action: string, error: Error, metadata?: Record<string, any>) => {
    errorTracker.error('user_action', `Error during ${action}`, error, metadata);
  };

  return {
    trackAction,
    trackError,
  };
}

// ==================== Example 8: Export Error Report ====================

/**
 * Export error report for debugging
 */
export function exportErrorReport() {
  const errorTracker = getGlobalErrorTracker();
  const performanceMonitor = getGlobalPerformanceMonitor();

  const report = {
    errors: JSON.parse(errorTracker.exportToJSON()),
    performance: JSON.parse(performanceMonitor.exportMetrics()),
    timestamp: new Date().toISOString(),
  };

  // Create download link
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `error-report-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ==================== Example 9: Real-time Error Display ====================

/**
 * Hook to display real-time errors (for development)
 */
export function useRealtimeErrors() {
  const errorTracker = getGlobalErrorTracker();

  // Get recent errors
  const getRecentErrors = (count: number = 10) => {
    const history = errorTracker.getErrorHistory();
    return history.slice(-count);
  };

  // Get error statistics
  const getErrorStats = () => {
    return {
      total: errorTracker.getTotalErrorCount(),
      byCategory: errorTracker.getErrorCount(),
    };
  };

  return {
    getRecentErrors,
    getErrorStats,
  };
}

// ==================== Example 10: Cleanup on Unmount ====================

/**
 * Cleanup error tracking on app unmount
 */
export function cleanupErrorTracking() {
  const performanceMonitor = getGlobalPerformanceMonitor();
  
  performanceMonitor.stopFPSTracking();
  performanceMonitor.stopMemoryTracking();
  performanceMonitor.stopAutoLogging();
}
