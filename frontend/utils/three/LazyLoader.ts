/**
 * Lazy Loading Utilities for 3D Components
 * 
 * Provides React hooks and utilities for lazy loading heavy 3D components
 * to improve initial page load time and reduce memory usage.
 * 
 * Features:
 * - useLazyComponent: React hook for lazy loading 3D components
 * - useIntersectionLoader: Loads components when they become visible
 * - preloadComponent: Background preloading for better UX
 * - Priority queue for controlling loading order
 * 
 * Requirements: 1.3, 2.3, 3.3
 */

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Loading priority levels
 * Higher priority components load first
 */
export enum LoadPriority {
  CRITICAL = 0,   // Load immediately (main room, visible elements)
  HIGH = 1,       // Load soon (nearby components)
  MEDIUM = 2,     // Load when idle (off-screen components)
  LOW = 3,        // Load last (distant components)
}

/**
 * Loading state for a component
 */
export enum LoadState {
  IDLE = 'idle',           // Not started loading
  LOADING = 'loading',     // Currently loading
  LOADED = 'loaded',       // Successfully loaded
  ERROR = 'error',         // Failed to load
}

/**
 * Configuration for lazy loading
 */
export interface LazyLoadConfig {
  priority?: LoadPriority;
  preload?: boolean;        // Whether to preload in background
  threshold?: number;       // Intersection observer threshold (0-1)
  rootMargin?: string;      // Intersection observer root margin
  enabled?: boolean;        // Whether lazy loading is enabled (default: true)
}

/**
 * Component loader function type
 */
export type ComponentLoader<T = any> = () => Promise<T>;

/**
 * Queue entry for component loading
 */
interface QueueEntry {
  id: string;
  priority: LoadPriority;
  loader: ComponentLoader;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

/**
 * Priority queue for managing component loading order
 * Lower priority number = higher priority (loads first)
 */
class LoadingQueue {
  private queue: QueueEntry[] = [];
  private loading = false;
  private currentLoad: Promise<void> | null = null;

  /**
   * Add a component to the loading queue
   */
  enqueue(entry: QueueEntry): void {
    // Insert in priority order (lower priority number first)
    const insertIndex = this.queue.findIndex(item => item.priority > entry.priority);
    
    if (insertIndex === -1) {
      this.queue.push(entry);
    } else {
      this.queue.splice(insertIndex, 0, entry);
    }

    // Start processing if not already loading
    if (!this.loading) {
      this.processQueue();
    }
  }

  /**
   * Process the queue, loading components in priority order
   */
  private async processQueue(): Promise<void> {
    if (this.loading || this.queue.length === 0) {
      return;
    }

    this.loading = true;

    while (this.queue.length > 0) {
      const entry = this.queue.shift()!;

      try {
        const result = await entry.loader();
        entry.resolve(result);
      } catch (error) {
        entry.reject(error);
      }

      // Small delay between loads to prevent blocking
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    this.loading = false;
  }

  /**
   * Get the current queue size
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Check if currently loading
   */
  isLoading(): boolean {
    return this.loading;
  }

  /**
   * Clear the queue
   */
  clear(): void {
    this.queue = [];
    this.loading = false;
  }
}

// Global loading queue singleton
let loadingQueueInstance: LoadingQueue | null = null;

/**
 * Get the global loading queue instance
 */
function getLoadingQueue(): LoadingQueue {
  if (!loadingQueueInstance) {
    loadingQueueInstance = new LoadingQueue();
  }
  return loadingQueueInstance;
}

/**
 * Reset the loading queue (useful for testing)
 */
export function resetLoadingQueue(): void {
  if (loadingQueueInstance) {
    loadingQueueInstance.clear();
    loadingQueueInstance = null;
  }
}

/**
 * React hook for lazy loading 3D components
 * 
 * Loads a component with priority-based queuing and state management.
 * 
 * Requirements: 1.3, 2.3, 3.3
 * 
 * @param loader - Function that returns a promise resolving to the component
 * @param config - Lazy loading configuration
 * @returns Object with component data, loading state, and error
 * 
 * @example
 * ```tsx
 * const { data: OutdoorEnv, state, error } = useLazyComponent(
 *   () => import('./OutdoorEnvironment'),
 *   { priority: LoadPriority.MEDIUM }
 * );
 * 
 * if (state === LoadState.LOADED && OutdoorEnv) {
 *   return <OutdoorEnv.default />;
 * }
 * ```
 */
export function useLazyComponent<T = any>(
  loader: ComponentLoader<T>,
  config: LazyLoadConfig = {}
): {
  data: T | null;
  state: LoadState;
  error: Error | null;
  load: () => void;
} {
  const {
    priority = LoadPriority.MEDIUM,
    preload = false,
    enabled = true,
  } = config;

  const [data, setData] = useState<T | null>(null);
  const [state, setState] = useState<LoadState>(LoadState.IDLE);
  const [error, setError] = useState<Error | null>(null);
  const loadedRef = useRef(false);
  const loadingRef = useRef(false);

  const load = useCallback(() => {
    // Skip if already loaded or loading
    if (loadedRef.current || loadingRef.current || !enabled) {
      return;
    }

    loadingRef.current = true;
    setState(LoadState.LOADING);

    // Add to priority queue
    const queue = getLoadingQueue();
    const id = `component-${Date.now()}-${Math.random()}`;

    queue.enqueue({
      id,
      priority,
      loader,
      resolve: (result: T) => {
        setData(result);
        setState(LoadState.LOADED);
        loadedRef.current = true;
        loadingRef.current = false;
      },
      reject: (err: Error) => {
        setError(err);
        setState(LoadState.ERROR);
        loadingRef.current = false;
        console.error('useLazyComponent: Failed to load component', err);
      },
    });
  }, [loader, priority, enabled]);

  // Auto-load for critical priority or preload
  useEffect(() => {
    if (priority === LoadPriority.CRITICAL || preload) {
      load();
    }
  }, [priority, preload, load]);

  return { data, state, error, load };
}

/**
 * React hook for loading components when they become visible
 * 
 * Uses Intersection Observer API to detect when an element enters the viewport
 * and triggers component loading.
 * 
 * Requirements: 1.3, 2.3, 3.3
 * 
 * @param loader - Function that returns a promise resolving to the component
 * @param config - Lazy loading configuration
 * @returns Object with component data, loading state, error, and ref to attach
 * 
 * @example
 * ```tsx
 * const { data: Door, state, ref } = useIntersectionLoader(
 *   () => import('./DoorComponent'),
 *   { priority: LoadPriority.HIGH, threshold: 0.1 }
 * );
 * 
 * return (
 *   <group ref={ref}>
 *     {state === LoadState.LOADED && Door && <Door.default />}
 *   </group>
 * );
 * ```
 */
export function useIntersectionLoader<T = any>(
  loader: ComponentLoader<T>,
  config: LazyLoadConfig = {}
): {
  data: T | null;
  state: LoadState;
  error: Error | null;
  ref: React.RefObject<any>;
} {
  const {
    threshold = 0.1,
    rootMargin = '50px',
    enabled = true,
  } = config;

  const ref = useRef<any>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  // Use the lazy component hook for actual loading
  const lazyResult = useLazyComponent(loader, {
    ...config,
    preload: false, // Don't preload, wait for intersection
  });

  // Set up intersection observer
  useEffect(() => {
    if (!enabled || !ref.current) {
      return;
    }

    // Create intersection observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !shouldLoad) {
            setShouldLoad(true);
            // Disconnect observer after first intersection
            if (observerRef.current) {
              observerRef.current.disconnect();
            }
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    // Start observing
    observerRef.current.observe(ref.current);

    // Cleanup
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [enabled, threshold, rootMargin, shouldLoad]);

  // Trigger load when intersection detected
  useEffect(() => {
    if (shouldLoad) {
      lazyResult.load();
    }
  }, [shouldLoad, lazyResult]);

  return {
    data: lazyResult.data,
    state: lazyResult.state,
    error: lazyResult.error,
    ref,
  };
}

/**
 * Preload a component in the background
 * 
 * Useful for preloading components that will be needed soon but aren't
 * critical for initial render.
 * 
 * Requirements: 1.3, 2.3
 * 
 * @param loader - Function that returns a promise resolving to the component
 * @param priority - Loading priority (default: LOW)
 * @returns Promise that resolves when component is loaded
 * 
 * @example
 * ```tsx
 * // Preload outdoor environment in background
 * useEffect(() => {
 *   preloadComponent(
 *     () => import('./OutdoorEnvironment'),
 *     LoadPriority.LOW
 *   );
 * }, []);
 * ```
 */
export function preloadComponent<T = any>(
  loader: ComponentLoader<T>,
  priority: LoadPriority = LoadPriority.LOW
): Promise<T> {
  return new Promise((resolve, reject) => {
    const queue = getLoadingQueue();
    const id = `preload-${Date.now()}-${Math.random()}`;

    queue.enqueue({
      id,
      priority,
      loader,
      resolve,
      reject,
    });
  });
}

/**
 * Get loading queue statistics
 * 
 * Useful for debugging and monitoring loading performance
 * 
 * @returns Object with queue size and loading status
 */
export function getLoadingStats(): {
  queueSize: number;
  isLoading: boolean;
} {
  const queue = getLoadingQueue();
  return {
    queueSize: queue.size(),
    isLoading: queue.isLoading(),
  };
}

/**
 * Utility to create a lazy-loadable component wrapper
 * 
 * Note: This function returns a component factory that should be used in .tsx files
 * The actual component rendering with JSX should be done in the consuming component
 * 
 * Requirements: 1.3, 2.3, 3.3
 * 
 * @param loader - Function that returns a promise resolving to the component
 * @param config - Lazy loading configuration
 * @returns Object with loading state and data for use in component rendering
 * 
 * @example
 * ```tsx
 * // In a .tsx file:
 * function MyComponent() {
 *   const { data, state, error } = useLazyComponent(
 *     () => import('./OutdoorEnvironment'),
 *     { priority: LoadPriority.MEDIUM }
 *   );
 * 
 *   if (state === LoadState.LOADED && data) {
 *     const Component = data.default || data;
 *     return <Component />;
 *   }
 *   return null;
 * }
 * ```
 */
export function createLazyComponentConfig<T = any>(
  loader: ComponentLoader<T>,
  config: LazyLoadConfig = {}
): {
  loader: ComponentLoader<T>;
  config: LazyLoadConfig;
} {
  return { loader, config };
}

/**
 * Hook to track if a component should be lazy loaded based on conditions
 * 
 * Requirements: 1.3, 2.3, 3.3
 * 
 * @param componentCount - Number of components to load
 * @param loadingStrategy - Loading strategy ('synchronous' or 'lazy')
 * @param isCritical - Whether this is a critical component
 * @returns Whether the component should be lazy loaded
 * 
 * @example
 * ```tsx
 * const shouldLazyLoad = useShouldLazyLoad(10, 'synchronous', false);
 * // Returns true if componentCount > 5 and not critical
 * ```
 */
export function useShouldLazyLoad(
  componentCount: number,
  loadingStrategy: 'synchronous' | 'lazy' = 'lazy',
  isCritical: boolean = false
): boolean {
  // Bug condition: input.loadingStrategy == 'synchronous' AND input.componentCount > 5
  // Critical components should never be lazy loaded (preservation requirement)
  
  if (isCritical) {
    return false; // Critical components load immediately
  }

  if (loadingStrategy === 'synchronous' && componentCount > 5) {
    return true; // Should lazy load to fix performance issue
  }

  if (loadingStrategy === 'lazy') {
    return true; // Explicitly requested lazy loading
  }

  return false; // Default to synchronous for small component counts
}

/**
 * Batch preload multiple components
 * 
 * Preloads multiple components with specified priorities
 * 
 * @param loaders - Array of loader functions with priorities
 * @returns Promise that resolves when all components are loaded
 * 
 * @example
 * ```tsx
 * batchPreload([
 *   { loader: () => import('./Door'), priority: LoadPriority.HIGH },
 *   { loader: () => import('./Window'), priority: LoadPriority.MEDIUM },
 * ]);
 * ```
 */
export function batchPreload(
  loaders: Array<{ loader: ComponentLoader; priority?: LoadPriority }>
): Promise<any[]> {
  const promises = loaders.map(({ loader, priority }) =>
    preloadComponent(loader, priority)
  );
  return Promise.all(promises);
}
