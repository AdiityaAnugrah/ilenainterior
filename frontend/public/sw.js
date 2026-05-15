// Service Worker for ILENA INTERIOR
// Implements offline support with multiple caching strategies

const CACHE_VERSION = 'ilena-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const MODEL_CACHE = `${CACHE_VERSION}-models`;
const API_CACHE = `${CACHE_VERSION}-api`;

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/planner',
  '/offline.html',
];

// Cache size limits (in number of items)
const CACHE_LIMITS = {
  [DYNAMIC_CACHE]: 50,
  [MODEL_CACHE]: 20,
  [API_CACHE]: 30,
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[Service Worker] Skip waiting');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[Service Worker] Installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Delete caches that don't match current version
              return cacheName.startsWith('ilena-') && 
                     !cacheName.startsWith(CACHE_VERSION);
            })
            .map((cacheName) => {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[Service Worker] Claiming clients');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome extensions and other protocols
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Determine caching strategy based on request type
  if (isStaticAsset(url)) {
    // Static assets: stale-while-revalidate
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
  } else if (is3DModel(url)) {
    // 3D models: cache-first
    event.respondWith(cacheFirst(request, MODEL_CACHE));
  } else if (isAPICall(url)) {
    // API calls: network-first with cache fallback
    event.respondWith(networkFirst(request, API_CACHE));
  } else {
    // Other resources: stale-while-revalidate
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
  }
});

// Helper: Check if request is for static asset
function isStaticAsset(url) {
  const staticExtensions = ['.js', '.css', '.woff', '.woff2', '.ttf', '.eot', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico'];
  return staticExtensions.some(ext => url.pathname.endsWith(ext));
}

// Helper: Check if request is for 3D model
function is3DModel(url) {
  const modelExtensions = ['.glb', '.gltf'];
  return modelExtensions.some(ext => url.pathname.endsWith(ext));
}

// Helper: Check if request is API call
function isAPICall(url) {
  return url.pathname.startsWith('/api/');
}

// Strategy 1: Stale-While-Revalidate
// Serve from cache immediately, update cache in background
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse && networkResponse.status === 200) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch((error) => {
      console.error('[Service Worker] Fetch failed:', error);
      return null;
    });
  
  // Return cached response immediately, or wait for network
  return cachedResponse || fetchPromise || createOfflineResponse();
}

// Strategy 2: Cache-First
// Serve from cache, fallback to network
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse && networkResponse.status === 200) {
      // Clone response before caching
      cache.put(request, networkResponse.clone());
      
      // Enforce cache size limit
      await limitCacheSize(cacheName, CACHE_LIMITS[cacheName]);
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[Service Worker] Cache-first fetch failed:', error);
    return createOfflineResponse();
  }
}

// Strategy 3: Network-First
// Try network first, fallback to cache if offline
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse && networkResponse.status === 200) {
      // Cache successful API responses
      cache.put(request, networkResponse.clone());
      
      // Enforce cache size limit
      await limitCacheSize(cacheName, CACHE_LIMITS[cacheName]);
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[Service Worker] Network-first fetch failed, trying cache:', error);
    
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Add header to indicate cached response
      const headers = new Headers(cachedResponse.headers);
      headers.set('X-From-Cache', 'true');
      
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers: headers,
      });
    }
    
    return createOfflineResponse();
  }
}

// Helper: Limit cache size by removing oldest entries
async function limitCacheSize(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > maxItems) {
    // Remove oldest entries (FIFO)
    const itemsToDelete = keys.length - maxItems;
    for (let i = 0; i < itemsToDelete; i++) {
      await cache.delete(keys[i]);
    }
    console.log(`[Service Worker] Trimmed ${itemsToDelete} items from ${cacheName}`);
  }
}

// Helper: Create offline response
function createOfflineResponse() {
  return new Response(
    JSON.stringify({
      error: 'Offline',
      message: 'You are currently offline. Please check your internet connection.',
    }),
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
    }
  );
}

// Message event - handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName.startsWith('ilena-'))
            .map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
  
  if (event.data && event.data.type === 'GET_CACHE_SIZE') {
    event.waitUntil(
      getCacheSize().then((size) => {
        event.ports[0].postMessage({ size });
      })
    );
  }
});

// Helper: Calculate total cache size
async function getCacheSize() {
  const cacheNames = await caches.keys();
  let totalSize = 0;
  
  for (const cacheName of cacheNames) {
    if (cacheName.startsWith('ilena-')) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      
      for (const request of keys) {
        const response = await cache.match(request);
        if (response) {
          const blob = await response.blob();
          totalSize += blob.size;
        }
      }
    }
  }
  
  return totalSize;
}

console.log('[Service Worker] Loaded');
