/**
 * Service Worker Registration Helper
 * Handles registration, updates, and lifecycle management of the service worker
 */

export interface ServiceWorkerConfig {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
  enableAutoUpdate?: boolean;
  updateInterval?: number; // in milliseconds
}

export class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private config: ServiceWorkerConfig;
  private updateCheckInterval: NodeJS.Timeout | null = null;

  constructor(config: ServiceWorkerConfig = {}) {
    this.config = {
      enableAutoUpdate: true,
      updateInterval: 60000, // Check for updates every 60 seconds
      ...config,
    };
  }

  /**
   * Register the service worker
   */
  async register(): Promise<ServiceWorkerRegistration | null> {
    // Only register in browser environment
    if (typeof window === 'undefined') {
      return null;
    }

    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
      console.warn('[SW] Service Workers are not supported in this browser');
      return null;
    }

    // Only register in production or when explicitly enabled
    if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_ENABLE_SW) {
      console.log('[SW] Service Worker disabled in development mode');
      return null;
    }

    try {
      console.log('[SW] Registering service worker...');

      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      this.registration = registration;

      console.log('[SW] Service Worker registered successfully:', registration.scope);

      // Handle different registration states
      if (registration.installing) {
        console.log('[SW] Service Worker installing...');
        this.trackInstalling(registration.installing);
      } else if (registration.waiting) {
        console.log('[SW] Service Worker waiting...');
        this.handleWaiting(registration);
      } else if (registration.active) {
        console.log('[SW] Service Worker active');
        this.config.onSuccess?.(registration);
      }

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        console.log('[SW] Update found!');
        const newWorker = registration.installing;
        if (newWorker) {
          this.trackInstalling(newWorker);
        }
      });

      // Enable auto-update checking
      if (this.config.enableAutoUpdate) {
        this.startAutoUpdateCheck();
      }

      // Handle controller change (new SW activated)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[SW] Controller changed, reloading page...');
        window.location.reload();
      });

      return registration;
    } catch (error) {
      console.error('[SW] Service Worker registration failed:', error);
      this.config.onError?.(error as Error);
      return null;
    }
  }

  /**
   * Track the installing service worker
   */
  private trackInstalling(worker: ServiceWorker): void {
    worker.addEventListener('statechange', () => {
      console.log('[SW] State changed to:', worker.state);

      if (worker.state === 'installed') {
        if (navigator.serviceWorker.controller) {
          // New service worker available
          console.log('[SW] New service worker available!');
          if (this.registration) {
            this.config.onUpdate?.(this.registration);
          }
        } else {
          // First time installation
          console.log('[SW] Service worker installed for the first time');
          if (this.registration) {
            this.config.onSuccess?.(this.registration);
          }
        }
      }
    });
  }

  /**
   * Handle waiting service worker
   */
  private handleWaiting(registration: ServiceWorkerRegistration): void {
    if (registration.waiting) {
      console.log('[SW] New service worker waiting to activate');
      this.config.onUpdate?.(registration);
    }
  }

  /**
   * Skip waiting and activate new service worker immediately
   */
  skipWaiting(): void {
    if (this.registration?.waiting) {
      console.log('[SW] Skipping waiting...');
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }

  /**
   * Unregister the service worker
   */
  async unregister(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const success = await this.registration.unregister();
      console.log('[SW] Service Worker unregistered:', success);
      this.stopAutoUpdateCheck();
      return success;
    } catch (error) {
      console.error('[SW] Failed to unregister service worker:', error);
      return false;
    }
  }

  /**
   * Check for service worker updates manually
   */
  async checkForUpdates(): Promise<void> {
    if (!this.registration) {
      return;
    }

    try {
      console.log('[SW] Checking for updates...');
      await this.registration.update();
    } catch (error) {
      console.error('[SW] Failed to check for updates:', error);
    }
  }

  /**
   * Start automatic update checking
   */
  private startAutoUpdateCheck(): void {
    if (this.updateCheckInterval) {
      return;
    }

    console.log('[SW] Starting auto-update check...');
    this.updateCheckInterval = setInterval(() => {
      this.checkForUpdates();
    }, this.config.updateInterval);
  }

  /**
   * Stop automatic update checking
   */
  private stopAutoUpdateCheck(): void {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
      this.updateCheckInterval = null;
      console.log('[SW] Stopped auto-update check');
    }
  }

  /**
   * Clear all caches
   */
  async clearCache(): Promise<void> {
    if (!this.registration?.active) {
      return;
    }

    try {
      console.log('[SW] Clearing cache...');
      this.registration.active.postMessage({ type: 'CLEAR_CACHE' });
      console.log('[SW] Cache cleared');
    } catch (error) {
      console.error('[SW] Failed to clear cache:', error);
    }
  }

  /**
   * Get cache size
   */
  async getCacheSize(): Promise<number> {
    if (!this.registration?.active) {
      return 0;
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();

      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.size || 0);
      };

      this.registration!.active!.postMessage(
        { type: 'GET_CACHE_SIZE' },
        [messageChannel.port2]
      );

      // Timeout after 5 seconds
      setTimeout(() => resolve(0), 5000);
    });
  }

  /**
   * Get registration status
   */
  getRegistration(): ServiceWorkerRegistration | null {
    return this.registration;
  }

  /**
   * Check if service worker is active
   */
  isActive(): boolean {
    return !!this.registration?.active;
  }
}

/**
 * Simple registration function for quick setup
 */
export async function registerServiceWorker(
  config?: ServiceWorkerConfig
): Promise<ServiceWorkerRegistration | null> {
  const manager = new ServiceWorkerManager(config);
  return manager.register();
}

/**
 * Format bytes to human-readable string
 */
export function formatCacheSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Hook for React components to use service worker
 */
export function useServiceWorker(config?: ServiceWorkerConfig) {
  if (typeof window === 'undefined') {
    return {
      manager: null,
      isSupported: false,
      isActive: false,
    };
  }

  const manager = new ServiceWorkerManager(config);
  const isSupported = 'serviceWorker' in navigator;

  return {
    manager,
    isSupported,
    isActive: manager.isActive(),
    register: () => manager.register(),
    unregister: () => manager.unregister(),
    checkForUpdates: () => manager.checkForUpdates(),
    clearCache: () => manager.clearCache(),
    getCacheSize: () => manager.getCacheSize(),
  };
}
