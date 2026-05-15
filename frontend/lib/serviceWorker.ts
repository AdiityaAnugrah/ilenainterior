/**
 * Service Worker Registration Utility for Next.js
 * Handles registration, updates, and communication with service worker
 */

export interface ServiceWorkerConfig {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
  enableAutoUpdate?: boolean;
  updateCheckInterval?: number; // in milliseconds
}

export interface CacheStats {
  size: number;
  formattedSize: string;
}

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private config: ServiceWorkerConfig;
  private updateCheckTimer: NodeJS.Timeout | null = null;

  constructor(config: ServiceWorkerConfig = {}) {
    this.config = {
      enableAutoUpdate: true,
      updateCheckInterval: 60000, // 1 minute
      ...config,
    };
  }

  /**
   * Register service worker
   */
  async register(swUrl: string = '/sw.js'): Promise<ServiceWorkerRegistration | null> {
    // Check if service workers are supported
    if (!this.isSupported()) {
      console.warn('[ServiceWorker] Service workers are not supported in this browser');
      return null;
    }

    // Only register in production or when explicitly enabled
    if (process.env.NODE_ENV !== 'production' && !process.env.NEXT_PUBLIC_ENABLE_SW) {
      console.log('[ServiceWorker] Skipping registration in development mode');
      return null;
    }

    try {
      console.log('[ServiceWorker] Registering...');
      
      const registration = await navigator.serviceWorker.register(swUrl, {
        scope: '/',
      });

      this.registration = registration;

      // Handle different registration states
      if (registration.installing) {
        console.log('[ServiceWorker] Installing...');
        this.trackInstalling(registration.installing);
      } else if (registration.waiting) {
        console.log('[ServiceWorker] Waiting...');
        this.handleWaiting(registration);
      } else if (registration.active) {
        console.log('[ServiceWorker] Active');
        this.config.onSuccess?.(registration);
      }

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        console.log('[ServiceWorker] Update found');
        const newWorker = registration.installing;
        if (newWorker) {
          this.trackInstalling(newWorker);
        }
      });

      // Check for updates periodically
      if (this.config.enableAutoUpdate) {
        this.startUpdateCheck();
      }

      return registration;
    } catch (error) {
      console.error('[ServiceWorker] Registration failed:', error);
      this.config.onError?.(error as Error);
      return null;
    }
  }

  /**
   * Unregister service worker
   */
  async unregister(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      
      if (registration) {
        const success = await registration.unregister();
        console.log('[ServiceWorker] Unregistered:', success);
        this.registration = null;
        this.stopUpdateCheck();
        return success;
      }
      
      return false;
    } catch (error) {
      console.error('[ServiceWorker] Unregistration failed:', error);
      return false;
    }
  }

  /**
   * Check if service workers are supported
   */
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'serviceWorker' in navigator;
  }

  /**
   * Check if currently online
   */
  isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  /**
   * Get current registration
   */
  getRegistration(): ServiceWorkerRegistration | null {
    return this.registration;
  }

  /**
   * Manually check for updates
   */
  async checkForUpdates(): Promise<void> {
    if (!this.registration) {
      console.warn('[ServiceWorker] No registration found');
      return;
    }

    try {
      console.log('[ServiceWorker] Checking for updates...');
      await this.registration.update();
    } catch (error) {
      console.error('[ServiceWorker] Update check failed:', error);
    }
  }

  /**
   * Skip waiting and activate new service worker immediately
   */
  async skipWaiting(): Promise<void> {
    if (!this.registration || !this.registration.waiting) {
      return;
    }

    console.log('[ServiceWorker] Skipping waiting...');
    
    // Send message to service worker to skip waiting
    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });

    // Reload page when new service worker takes control
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[ServiceWorker] Controller changed, reloading...');
      window.location.reload();
    });
  }

  /**
   * Clear all caches
   */
  async clearCache(): Promise<void> {
    if (!this.registration || !this.registration.active) {
      return;
    }

    console.log('[ServiceWorker] Clearing cache...');
    this.registration.active.postMessage({ type: 'CLEAR_CACHE' });
  }

  /**
   * Get cache size
   */
  async getCacheSize(): Promise<CacheStats | null> {
    if (!this.registration || !this.registration.active) {
      return null;
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        const size = event.data.size;
        resolve({
          size,
          formattedSize: this.formatBytes(size),
        });
      };

      this.registration!.active!.postMessage(
        { type: 'GET_CACHE_SIZE' },
        [messageChannel.port2]
      );

      // Timeout after 5 seconds
      setTimeout(() => resolve(null), 5000);
    });
  }

  /**
   * Track installing service worker
   */
  private trackInstalling(worker: ServiceWorker): void {
    worker.addEventListener('statechange', () => {
      console.log('[ServiceWorker] State changed:', worker.state);
      
      if (worker.state === 'installed') {
        if (navigator.serviceWorker.controller) {
          // New service worker available
          console.log('[ServiceWorker] New version available');
          this.handleWaiting(this.registration!);
        } else {
          // First time installation
          console.log('[ServiceWorker] Content cached for offline use');
          this.config.onSuccess?.(this.registration!);
        }
      } else if (worker.state === 'activated') {
        console.log('[ServiceWorker] Activated');
      }
    });
  }

  /**
   * Handle waiting service worker
   */
  private handleWaiting(registration: ServiceWorkerRegistration): void {
    if (registration.waiting) {
      console.log('[ServiceWorker] New version waiting');
      this.config.onUpdate?.(registration);
    }
  }

  /**
   * Start periodic update checks
   */
  private startUpdateCheck(): void {
    if (this.updateCheckTimer) {
      return;
    }

    this.updateCheckTimer = setInterval(() => {
      this.checkForUpdates();
    }, this.config.updateCheckInterval);

    console.log('[ServiceWorker] Auto-update enabled');
  }

  /**
   * Stop periodic update checks
   */
  private stopUpdateCheck(): void {
    if (this.updateCheckTimer) {
      clearInterval(this.updateCheckTimer);
      this.updateCheckTimer = null;
      console.log('[ServiceWorker] Auto-update disabled');
    }
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

// Singleton instance
let serviceWorkerManager: ServiceWorkerManager | null = null;

/**
 * Get or create service worker manager instance
 */
export function getServiceWorkerManager(config?: ServiceWorkerConfig): ServiceWorkerManager {
  if (!serviceWorkerManager) {
    serviceWorkerManager = new ServiceWorkerManager(config);
  }
  return serviceWorkerManager;
}

/**
 * Register service worker with default configuration
 */
export async function registerServiceWorker(
  config?: ServiceWorkerConfig
): Promise<ServiceWorkerRegistration | null> {
  const manager = getServiceWorkerManager(config);
  return manager.register();
}

/**
 * Unregister service worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  const manager = getServiceWorkerManager();
  return manager.unregister();
}

/**
 * Hook for React components to use service worker
 */
export function useServiceWorker(config?: ServiceWorkerConfig) {
  const [isSupported, setIsSupported] = React.useState(false);
  const [isRegistered, setIsRegistered] = React.useState(false);
  const [isOnline, setIsOnline] = React.useState(true);
  const [updateAvailable, setUpdateAvailable] = React.useState(false);
  const [cacheSize, setCacheSize] = React.useState<CacheStats | null>(null);

  React.useEffect(() => {
    const manager = getServiceWorkerManager({
      ...config,
      onSuccess: (registration) => {
        setIsRegistered(true);
        config?.onSuccess?.(registration);
      },
      onUpdate: (registration) => {
        setUpdateAvailable(true);
        config?.onUpdate?.(registration);
      },
      onError: config?.onError,
    });

    setIsSupported(manager.isSupported());
    setIsOnline(manager.isOnline());

    // Register service worker
    manager.register();

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const updateServiceWorker = React.useCallback(async () => {
    const manager = getServiceWorkerManager();
    await manager.skipWaiting();
    setUpdateAvailable(false);
  }, []);

  const clearCache = React.useCallback(async () => {
    const manager = getServiceWorkerManager();
    await manager.clearCache();
  }, []);

  const refreshCacheSize = React.useCallback(async () => {
    const manager = getServiceWorkerManager();
    const size = await manager.getCacheSize();
    setCacheSize(size);
  }, []);

  return {
    isSupported,
    isRegistered,
    isOnline,
    updateAvailable,
    cacheSize,
    updateServiceWorker,
    clearCache,
    refreshCacheSize,
  };
}

// Import React for the hook
import React from 'react';

export default ServiceWorkerManager;
