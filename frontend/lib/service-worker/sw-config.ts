/**
 * Service Worker Configuration
 * Centralized configuration for service worker behavior
 */

export const SW_CONFIG = {
  // Cache version - increment to force cache refresh
  CACHE_VERSION: 'ilena-v1',
  
  // Cache names
  CACHE_NAMES: {
    STATIC: 'ilena-v1-static',
    DYNAMIC: 'ilena-v1-dynamic',
    MODELS: 'ilena-v1-models',
    API: 'ilena-v1-api',
  },
  
  // Cache size limits (number of items)
  CACHE_LIMITS: {
    DYNAMIC: 50,
    MODELS: 20,
    API: 30,
  },
  
  // Static assets to precache on install
  STATIC_ASSETS: [
    '/',
    '/planner',
    '/offline.html',
  ],
  
  // File extensions for different caching strategies
  STATIC_EXTENSIONS: [
    '.js',
    '.css',
    '.woff',
    '.woff2',
    '.ttf',
    '.eot',
    '.svg',
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.webp',
    '.ico',
  ],
  
  MODEL_EXTENSIONS: [
    '.glb',
    '.gltf',
  ],
  
  // API path prefix
  API_PREFIX: '/api/',
  
  // Update check interval (milliseconds)
  UPDATE_CHECK_INTERVAL: 60000, // 60 seconds
  
  // Enable auto-update by default
  ENABLE_AUTO_UPDATE: true,
  
  // Enable service worker in development
  ENABLE_IN_DEV: false,
} as const;

export type CacheName = typeof SW_CONFIG.CACHE_NAMES[keyof typeof SW_CONFIG.CACHE_NAMES];
