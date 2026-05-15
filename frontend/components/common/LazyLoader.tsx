/**
 * LazyLoader Component
 * 
 * Provides dynamic imports with React.lazy, preloading support, and retry logic
 * for code splitting and optimized bundle loading.
 * 
 * Features:
 * - Dynamic component loading with React.lazy
 * - Preloading support for critical components
 * - Retry logic with exponential backoff (max 3 retries)
 * - Loading fallback UI
 * - Error handling with error boundary
 * - TypeScript support with full type safety
 */

import React, { ComponentType, LazyExoticComponent, ReactNode, Suspense } from 'react';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface LazyLoadOptions {
  /** Fallback UI to show while component is loading */
  fallback?: ReactNode;
  /** Whether to preload the component immediately */
  preload?: boolean;
  /** Delay before showing fallback (ms) */
  delay?: number;
  /** Error handler callback */
  onError?: (error: Error) => void;
}

export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Initial delay between retries (ms) */
  initialDelay?: number;
  /** Whether to use exponential backoff */
  exponentialBackoff?: boolean;
}

export interface LazyComponentWithPreload<T extends ComponentType<any>> 
  extends LazyExoticComponent<T> {
  /** Preload the component */
  preload: () => Promise<void>;
  /** Check if component is already loaded */
  isLoaded: () => boolean;
}

// ============================================================================
// Default Configurations
// ============================================================================

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  exponentialBackoff: true,
};

const DEFAULT_LAZY_OPTIONS: LazyLoadOptions = {
  fallback: <LoadingFallback />,
  preload: false,
  delay: 0,
};

// ============================================================================
// Loading Fallback Component
// ============================================================================

function LoadingFallback() {
  return (
    <div className="lazy-loader-fallback" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      minHeight: '200px',
    }}>
      <div className="spinner" style={{
        width: '40px',
        height: '40px',
        border: '4px solid #f3f3f3',
        borderTop: '4px solid #3498db',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }} />
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Error Fallback Component
// ============================================================================

interface ErrorFallbackProps {
  error: Error;
  retry: () => void;
}

function ErrorFallback({ error, retry }: ErrorFallbackProps) {
  return (
    <div className="lazy-loader-error" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      minHeight: '200px',
      textAlign: 'center',
    }}>
      <div style={{ marginBottom: '1rem', color: '#e74c3c' }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 600 }}>
        Failed to Load Component
      </h3>
      <p style={{ margin: '0 0 1rem 0', color: '#666', fontSize: '0.875rem' }}>
        {error.message || 'An error occurred while loading the component'}
      </p>
      <button
        onClick={retry}
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#3498db',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '0.875rem',
          fontWeight: 500,
        }}
      >
        Retry
      </button>
    </div>
  );
}

// ============================================================================
// Retry Logic with Exponential Backoff
// ============================================================================

/**
 * Retry a function with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: Required<RetryOptions>
): Promise<T> {
  const { maxRetries, initialDelay, exponentialBackoff } = options;
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Log the error
      console.error(
        `[LazyLoader] Import failed (attempt ${attempt + 1}/${maxRetries + 1}):`,
        error
      );

      // Don't retry if this was the last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = exponentialBackoff
        ? initialDelay * Math.pow(2, attempt)
        : initialDelay;

      console.log(`[LazyLoader] Retrying in ${delay}ms...`);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// ============================================================================
// Lazy Load with Retry
// ============================================================================

/**
 * Create a lazy-loaded component with retry logic
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  retryOptions?: RetryOptions
): LazyExoticComponent<T> {
  const options = { ...DEFAULT_RETRY_OPTIONS, ...retryOptions };

  return React.lazy(() =>
    retryWithBackoff(importFn, options)
  );
}

// ============================================================================
// Lazy Load with Preload
// ============================================================================

/**
 * Create a lazy-loaded component with preload capability
 */
export function lazyWithPreload<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
): LazyComponentWithPreload<T> {
  let modulePromise: Promise<{ default: T }> | null = null;
  let isLoadedFlag = false;

  const LazyComponent = React.lazy(() => {
    if (!modulePromise) {
      modulePromise = importFn().then(module => {
        isLoadedFlag = true;
        return module;
      });
    }
    return modulePromise;
  }) as LazyComponentWithPreload<T>;

  LazyComponent.preload = async () => {
    if (!modulePromise) {
      modulePromise = importFn().then(module => {
        isLoadedFlag = true;
        return module;
      });
    }
    await modulePromise;
  };

  LazyComponent.isLoaded = () => isLoadedFlag;

  return LazyComponent;
}

// ============================================================================
// Main Lazy Load Function
// ============================================================================

/**
 * Create a lazy-loaded component with full features:
 * - Retry logic with exponential backoff
 * - Preload capability
 * - Custom loading fallback
 * - Error handling
 */
export function lazyLoad<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options?: LazyLoadOptions & RetryOptions
): LazyComponentWithPreload<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    exponentialBackoff = true,
    ...lazyOptions
  } = { ...DEFAULT_LAZY_OPTIONS, ...options };

  let modulePromise: Promise<{ default: T }> | null = null;
  let isLoadedFlag = false;

  // Create the lazy component with retry logic
  const LazyComponent = React.lazy(() => {
    if (!modulePromise) {
      modulePromise = retryWithBackoff(
        importFn,
        { maxRetries, initialDelay, exponentialBackoff }
      ).then(module => {
        isLoadedFlag = true;
        return module;
      });
    }
    return modulePromise;
  }) as LazyComponentWithPreload<T>;

  // Add preload method
  LazyComponent.preload = async () => {
    if (!modulePromise) {
      modulePromise = retryWithBackoff(
        importFn,
        { maxRetries, initialDelay, exponentialBackoff }
      ).then(module => {
        isLoadedFlag = true;
        return module;
      });
    }
    await modulePromise;
  };

  // Add isLoaded method
  LazyComponent.isLoaded = () => isLoadedFlag;

  // Preload immediately if requested
  if (lazyOptions.preload) {
    LazyComponent.preload().catch(error => {
      console.error('[LazyLoader] Preload failed:', error);
      if (lazyOptions.onError) {
        lazyOptions.onError(error);
      }
    });
  }

  return LazyComponent;
}

// ============================================================================
// Preload Component Function
// ============================================================================

/**
 * Preload a component without rendering it
 */
export async function preloadComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
): Promise<void> {
  try {
    await importFn();
    console.log('[LazyLoader] Component preloaded successfully');
  } catch (error) {
    console.error('[LazyLoader] Preload failed:', error);
    throw error;
  }
}

// ============================================================================
// Lazy Loader Wrapper Component
// ============================================================================

interface LazyLoaderProps {
  /** The lazy-loaded component to render */
  component: LazyExoticComponent<any>;
  /** Props to pass to the lazy component */
  componentProps?: Record<string, any>;
  /** Fallback UI while loading */
  fallback?: ReactNode;
  /** Error handler */
  onError?: (error: Error) => void;
}

interface LazyLoaderState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Wrapper component for lazy-loaded components with error boundary
 */
export class LazyLoader extends React.Component<LazyLoaderProps, LazyLoaderState> {
  constructor(props: LazyLoaderProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): LazyLoaderState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[LazyLoader] Error caught:', error, errorInfo);
    if (this.props.onError) {
      this.props.onError(error);
    }
  }

  retry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    const { component: Component, componentProps, fallback } = this.props;
    const { hasError, error } = this.state;

    if (hasError && error) {
      return <ErrorFallback error={error} retry={this.retry} />;
    }

    return (
      <Suspense fallback={fallback || <LoadingFallback />}>
        <Component {...componentProps} />
      </Suspense>
    );
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Prefetch multiple components in parallel
 */
export async function prefetchComponents(
  importFns: Array<() => Promise<{ default: ComponentType<any> }>>
): Promise<void> {
  try {
    await Promise.all(importFns.map(fn => fn()));
    console.log(`[LazyLoader] ${importFns.length} components prefetched successfully`);
  } catch (error) {
    console.error('[LazyLoader] Prefetch failed:', error);
    throw error;
  }
}

/**
 * Check if a component is already loaded
 */
export function isComponentLoaded<T extends ComponentType<any>>(
  component: LazyComponentWithPreload<T>
): boolean {
  return component.isLoaded();
}

// ============================================================================
// Export Default
// ============================================================================

export default {
  lazyLoad,
  lazyWithRetry,
  lazyWithPreload,
  preloadComponent,
  prefetchComponents,
  isComponentLoaded,
  LazyLoader,
  LoadingFallback,
  ErrorFallback,
};
