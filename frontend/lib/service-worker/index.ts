/**
 * Service Worker Module
 * Exports all service worker related utilities
 */

export { ServiceWorkerManager, registerServiceWorker, useServiceWorker, formatCacheSize } from '@/app/register-sw';
export { SW_CONFIG } from './sw-config';
export type { CacheName } from './sw-config';
