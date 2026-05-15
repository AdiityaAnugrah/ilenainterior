# ErrorTracker Integration Guide

## Overview

ErrorTracker provides comprehensive error tracking and logging for the frontend application. It integrates with PerformanceMonitor to automatically log performance warnings, errors, and slow operations.

## Features

- **Severity Levels**: info, warning, error, critical
- **Categorization**: performance, api, javascript, network, asset_loading, webgl, memory
- **Context Tracking**: User agent, URL, timestamp, session ID, user ID
- **Stack Traces**: Automatic stack trace capture for JavaScript errors
- **Global Error Handlers**: Catches uncaught errors and unhandled promise rejections
- **Integration**: Works seamlessly with PerformanceMonitor
- **Extensible**: Console-based now, easily extensible for Sentry/DataDog/etc

## Basic Usage

### Standalone Usage

```typescript
import { ErrorTracker } from './ErrorTracker';

// Create instance
const errorTracker = new ErrorTracker({
  enableConsoleLogging: true,
  enableRemoteLogging: false,
  maxErrorHistory: 100,
});

// Log different severity levels
errorTracker.info('user_action', 'User clicked save button');
errorTracker.warning('validation', 'Invalid input detected', { field: 'email' });
errorTracker.error('api', 'Failed to fetch data', error, { endpoint: '/api/products' });
errorTracker.critical('system', 'Out of memory', error);

// Specialized logging
errorTracker.logPerformanceWarning('low_fps', { fps: 25 });
errorTracker.logSlowAPI('/api/products', 2500, 2000);
errorTracker.logJavaScriptError(error, 'Canvas3D component');
errorTracker.logAssetLoadError('/models/chair.glb', 'model', error);
```

### Integrated with PerformanceMonitor

```typescript
import { PerformanceMonitor } from '../performance/PerformanceMonitor';
import { createIntegratedErrorTracker } from './ErrorTracker';

// Create performance monitor
const performanceMonitor = new PerformanceMonitor({
  enableFPSTracking: true,
  enableMemoryTracking: true,
  enableAPITracking: true,
  fpsWarningThreshold: 30,
  memoryWarningThreshold: 80,
  apiLatencyWarningThreshold: 2000,
});

// Create integrated error tracker
const errorTracker = createIntegratedErrorTracker(performanceMonitor, {
  enableConsoleLogging: true,
  sessionId: 'session_123',
  userId: 'user_456',
});

// Start monitoring
performanceMonitor.startFPSTracking();
performanceMonitor.startMemoryTracking();

// Errors are automatically logged when thresholds are exceeded
// - Low FPS warnings
// - High memory warnings
// - Slow API warnings
```

### Using Global Instance

```typescript
import { getGlobalErrorTracker } from './ErrorTracker';

// Get global instance (creates if doesn't exist)
const errorTracker = getGlobalErrorTracker({
  enableConsoleLogging: true,
});

// Use anywhere in your app
errorTracker.error('component', 'Failed to render', error);
```

## Integration Examples

### Canvas3D Component

```typescript
import { useEffect } from 'react';
import { getGlobalPerformanceMonitor } from '@/lib/performance/PerformanceMonitor';
import { createIntegratedErrorTracker } from '@/lib/monitoring/ErrorTracker';

export function Canvas3D() {
  useEffect(() => {
    const performanceMonitor = getGlobalPerformanceMonitor();
    const errorTracker = createIntegratedErrorTracker(performanceMonitor);

    performanceMonitor.startFPSTracking();
    performanceMonitor.startMemoryTracking();

    return () => {
      performanceMonitor.stopFPSTracking();
      performanceMonitor.stopMemoryTracking();
    };
  }, []);

  // Component code...
}
```

### API Client

```typescript
import { getGlobalErrorTracker } from '@/lib/monitoring/ErrorTracker';

export async function fetchProducts() {
  const errorTracker = getGlobalErrorTracker();
  const startTime = performance.now();

  try {
    const response = await fetch('/api/products');
    const duration = performance.now() - startTime;

    if (!response.ok) {
      errorTracker.logNetworkError('/api/products', response.status, response.statusText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Log slow API calls
    if (duration > 2000) {
      errorTracker.logSlowAPI('/api/products', duration, 2000);
    }

    return await response.json();
  } catch (error) {
    errorTracker.error('api', 'Failed to fetch products', error as Error, {
      endpoint: '/api/products',
    });
    throw error;
  }
}
```

### Asset Loader Integration

```typescript
import { getGlobalErrorTracker } from '@/lib/monitoring/ErrorTracker';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export async function loadModel(url: string) {
  const errorTracker = getGlobalErrorTracker();
  const loader = new GLTFLoader();

  try {
    const gltf = await loader.loadAsync(url);
    return gltf;
  } catch (error) {
    errorTracker.logAssetLoadError(url, 'model', error as Error);
    throw error;
  }
}
```

### Memory Manager Integration

```typescript
import { getGlobalErrorTracker } from '@/lib/monitoring/ErrorTracker';
import { MemoryManager } from '@/lib/memory/MemoryManager';

const memoryManager = new MemoryManager({
  maxMemoryUsage: 200,
  cleanupThreshold: 80,
});

const errorTracker = getGlobalErrorTracker();

// Monitor memory usage
setInterval(() => {
  const stats = memoryManager.getStats();
  const percentage = (stats.totalMemoryUsage / stats.maxMemoryUsage) * 100;

  if (percentage > 80) {
    errorTracker.logMemoryWarning(
      stats.totalMemoryUsage * 1024 * 1024,
      stats.maxMemoryUsage * 1024 * 1024,
      percentage
    );
  }
}, 10000);
```

## API Reference

### Constructor Options

```typescript
interface ErrorTrackerConfig {
  enableConsoleLogging: boolean;      // Log to console (default: true)
  enableRemoteLogging: boolean;       // Send to remote service (default: false)
  remoteEndpoint?: string;            // Remote logging endpoint
  maxErrorHistory: number;            // Max errors to keep in memory (default: 100)
  sessionId?: string;                 // Session identifier
  userId?: string;                    // User identifier
}
```

### Methods

#### Logging Methods
- `info(category, message, metadata?)` - Log info message
- `warning(category, message, metadata?)` - Log warning
- `error(category, message, error?, metadata?)` - Log error
- `critical(category, message, error?, metadata?)` - Log critical error

#### Specialized Methods
- `logPerformanceWarning(type, details)` - Log performance warning
- `logSlowAPI(endpoint, duration, threshold)` - Log slow API call
- `logJavaScriptError(error, context?)` - Log JS error with stack trace
- `logNetworkError(endpoint, statusCode?, errorMessage?)` - Log network error
- `logAssetLoadError(assetUrl, assetType, error?)` - Log asset loading error
- `logWebGLError(message, details?)` - Log WebGL error
- `logMemoryWarning(usedMemory, totalMemory, percentage)` - Log memory warning

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

#### Context Methods
- `setUserId(userId)` - Set user ID for context
- `setSessionId(sessionId)` - Set session ID for context

## Error Categories

- **performance**: FPS drops, slow renders, high memory
- **api**: API errors, slow API calls, network issues
- **javascript**: Uncaught errors, unhandled rejections
- **network**: Network failures, timeouts
- **asset_loading**: Failed to load models, textures, images
- **webgl**: WebGL context errors, shader errors
- **memory**: Memory warnings, out of memory
- **uncaught_error**: Global uncaught errors
- **unhandled_rejection**: Unhandled promise rejections

## Severity Levels

- **info**: Informational messages, user actions
- **warning**: Non-critical issues, performance warnings
- **error**: Errors that affect functionality
- **critical**: Critical errors that may crash the app

## Remote Logging

To enable remote logging (e.g., to Sentry, DataDog):

```typescript
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
  "category": "api",
  "message": "Failed to fetch products",
  "context": {
    "userAgent": "Mozilla/5.0...",
    "url": "https://example.com/planner",
    "timestamp": 1715405885996,
    "sessionId": "session_123",
    "userId": "user_456"
  },
  "stackTrace": "Error: Failed to fetch...",
  "metadata": {
    "endpoint": "/api/products"
  }
}
```

## Best Practices

1. **Use Global Instance**: Use `getGlobalErrorTracker()` for consistency across the app
2. **Set Context Early**: Set userId and sessionId as soon as they're available
3. **Integrate with PerformanceMonitor**: Use `createIntegratedErrorTracker()` for automatic performance error logging
4. **Categorize Properly**: Use appropriate categories for easier filtering and analysis
5. **Include Metadata**: Add relevant metadata to help with debugging
6. **Don't Over-Log**: Use appropriate severity levels to avoid noise
7. **Export Regularly**: Export error logs for analysis and monitoring
8. **Clean Up**: Clear history periodically to prevent memory bloat

## Example: Complete Setup

```typescript
// app/layout.tsx or _app.tsx
import { useEffect } from 'react';
import { getGlobalPerformanceMonitor } from '@/lib/performance/PerformanceMonitor';
import { createIntegratedErrorTracker } from '@/lib/monitoring/ErrorTracker';

export default function RootLayout({ children }) {
  useEffect(() => {
    // Initialize performance monitor
    const performanceMonitor = getGlobalPerformanceMonitor({
      enableFPSTracking: true,
      enableMemoryTracking: true,
      enableAPITracking: true,
      fpsWarningThreshold: 30,
      memoryWarningThreshold: 80,
      apiLatencyWarningThreshold: 2000,
    });

    // Initialize integrated error tracker
    const errorTracker = createIntegratedErrorTracker(performanceMonitor, {
      enableConsoleLogging: process.env.NODE_ENV === 'development',
      enableRemoteLogging: process.env.NODE_ENV === 'production',
      remoteEndpoint: process.env.NEXT_PUBLIC_ERROR_TRACKING_ENDPOINT,
      sessionId: generateSessionId(),
    });

    // Set user ID when available
    const userId = getUserId(); // Your auth logic
    if (userId) {
      errorTracker.setUserId(userId);
    }

    // Start monitoring
    performanceMonitor.startFPSTracking();
    performanceMonitor.startMemoryTracking();

    // Cleanup
    return () => {
      performanceMonitor.destroy();
    };
  }, []);

  return <>{children}</>;
}
```
