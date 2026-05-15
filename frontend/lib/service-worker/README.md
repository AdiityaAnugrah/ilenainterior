# Service Worker Implementation

This directory contains the service worker implementation for ILENA INTERIOR, providing offline support and optimized caching strategies.

## Overview

The service worker implements multiple caching strategies to optimize performance and provide offline functionality:

1. **Stale-While-Revalidate**: For static assets (JS, CSS, images, fonts)
2. **Cache-First**: For 3D models (.glb, .gltf files)
3. **Network-First**: For API calls with cache fallback

## Files

### `/public/sw.js`
The main service worker file that handles:
- Asset caching with multiple strategies
- Cache versioning and cleanup
- Offline fallback
- Cache size limits
- Message handling for cache management

### `/app/register-sw.ts`
Service worker registration helper that provides:
- `ServiceWorkerManager` class for full control
- `registerServiceWorker()` function for simple setup
- `useServiceWorker()` hook for React components
- Automatic update checking
- Cache management utilities

### `/components/ServiceWorkerProvider.tsx`
React component that:
- Registers the service worker on app load
- Shows update notifications when new version available
- Handles service worker lifecycle events
- Provides UI for updating the app

### `/public/offline.html`
Offline fallback page shown when user is offline and requested page is not cached.

## Usage

### Basic Registration

The service worker is automatically registered in the root layout (`app/layout.tsx`):

```tsx
import { ServiceWorkerProvider } from '@/components/ServiceWorkerProvider';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ServiceWorkerProvider>
          {children}
        </ServiceWorkerProvider>
      </body>
    </html>
  );
}
```

### Manual Registration

For more control, use the `ServiceWorkerManager` class:

```typescript
import { ServiceWorkerManager } from '@/app/register-sw';

const manager = new ServiceWorkerManager({
  onSuccess: (registration) => {
    console.log('Service worker registered');
  },
  onUpdate: (registration) => {
    console.log('New version available');
  },
  onError: (error) => {
    console.error('Registration failed', error);
  },
  enableAutoUpdate: true,
  updateInterval: 60000, // Check every 60 seconds
});

await manager.register();
```

### Using the Hook

In React components:

```typescript
import { useServiceWorker } from '@/app/register-sw';

function MyComponent() {
  const { manager, isSupported, isActive, register, clearCache, getCacheSize } = useServiceWorker();

  const handleClearCache = async () => {
    await clearCache();
    console.log('Cache cleared');
  };

  const handleCheckSize = async () => {
    const size = await getCacheSize();
    console.log('Cache size:', formatCacheSize(size));
  };

  return (
    <div>
      <p>Service Worker: {isActive ? 'Active' : 'Inactive'}</p>
      <button onClick={handleClearCache}>Clear Cache</button>
      <button onClick={handleCheckSize}>Check Cache Size</button>
    </div>
  );
}
```

## Caching Strategies

### 1. Stale-While-Revalidate (Static Assets)

Used for: `.js`, `.css`, `.woff`, `.woff2`, `.ttf`, `.eot`, `.svg`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.ico`

**Behavior:**
- Serve from cache immediately if available
- Fetch from network in background and update cache
- Best for static assets that change occasionally

**Benefits:**
- Fast response time (instant from cache)
- Always up-to-date (background update)
- Works offline if previously cached

### 2. Cache-First (3D Models)

Used for: `.glb`, `.gltf` files

**Behavior:**
- Check cache first
- If found, serve from cache
- If not found, fetch from network and cache
- Cache size limited to 20 items (FIFO eviction)

**Benefits:**
- Extremely fast loading for previously loaded models
- Reduces bandwidth usage
- Works offline for cached models

### 3. Network-First (API Calls)

Used for: `/api/*` endpoints

**Behavior:**
- Try network first
- If network fails, serve from cache
- Cache successful responses
- Cache size limited to 30 items (FIFO eviction)
- Add `X-From-Cache: true` header when serving from cache

**Benefits:**
- Always fresh data when online
- Graceful degradation when offline
- Reduced API load for repeated requests

## Cache Management

### Cache Versioning

The service worker uses versioned caches:
- `ilena-v1-static`: Static assets
- `ilena-v1-dynamic`: Dynamic resources
- `ilena-v1-models`: 3D models
- `ilena-v1-api`: API responses

When the cache version changes, old caches are automatically deleted.

### Cache Size Limits

To prevent excessive storage usage:
- Dynamic cache: 50 items max
- Model cache: 20 items max
- API cache: 30 items max

Oldest items are removed when limits are reached (FIFO).

### Manual Cache Control

Clear all caches:
```typescript
const manager = new ServiceWorkerManager();
await manager.register();
await manager.clearCache();
```

Get cache size:
```typescript
const size = await manager.getCacheSize();
console.log('Total cache size:', formatCacheSize(size));
```

## Update Handling

### Automatic Updates

The service worker checks for updates every 60 seconds by default. When a new version is detected:

1. New service worker is downloaded and installed
2. Update notification is shown to user
3. User can choose to update now or later
4. Clicking "Update Now" activates new service worker and reloads page

### Manual Update Check

```typescript
const manager = new ServiceWorkerManager();
await manager.register();
await manager.checkForUpdates();
```

### Skip Waiting

Force immediate activation of new service worker:
```typescript
manager.skipWaiting();
```

## Offline Support

### Offline Fallback Page

When user is offline and requests a page that's not cached, they see `/offline.html` with:
- Friendly offline message
- Connection status indicator
- Retry button
- Auto-reload when connection restored

### Offline Detection

The service worker automatically detects offline state and:
- Serves cached content when available
- Shows offline fallback for uncached pages
- Returns 503 Service Unavailable for uncached API calls

## Development

### Enable in Development

By default, service worker is disabled in development mode. To enable:

```bash
# .env.local
NEXT_PUBLIC_ENABLE_SW=true
```

### Debugging

Service worker logs are prefixed with `[SW]` or `[Service Worker]`:

```javascript
console.log('[SW] Service Worker registered');
console.log('[SW] Caching static assets');
console.log('[SW] Update found!');
```

### Testing Offline

1. Open DevTools → Application → Service Workers
2. Check "Offline" checkbox
3. Reload page to test offline behavior

### Clearing Cache

In DevTools:
1. Application → Storage → Clear site data
2. Or use the cache management API in code

## Performance Impact

### Benefits

- **Faster Load Times**: Cached assets load instantly
- **Reduced Bandwidth**: Fewer network requests
- **Offline Support**: App works without internet
- **Better UX**: No loading spinners for cached content

### Considerations

- **Storage Usage**: Caches use browser storage (limited by cache size limits)
- **Update Delay**: Users may see old content until cache updates
- **First Visit**: No benefit on first visit (cache empty)

## Browser Support

Service workers are supported in:
- Chrome 40+
- Firefox 44+
- Safari 11.1+
- Edge 17+

For unsupported browsers, the app works normally without offline support.

## Security

- Service workers only work over HTTPS (or localhost for development)
- Same-origin policy applies to all cached resources
- Service worker scope is limited to `/` (entire app)

## Troubleshooting

### Service Worker Not Registering

1. Check browser console for errors
2. Verify HTTPS is enabled (or using localhost)
3. Check if service worker is blocked by browser settings
4. Verify `/sw.js` is accessible

### Cache Not Updating

1. Check cache version in `sw.js`
2. Increment version to force cache refresh
3. Clear browser cache manually
4. Check network tab for 304 Not Modified responses

### Offline Page Not Showing

1. Verify `/offline.html` is in public directory
2. Check if offline page is cached in static cache
3. Test with DevTools offline mode

### High Storage Usage

1. Check cache size with `getCacheSize()`
2. Reduce cache size limits in `sw.js`
3. Clear cache with `clearCache()`
4. Review cached items in DevTools → Application → Cache Storage

## Future Enhancements

Potential improvements:
- Background sync for offline mutations
- Push notifications for updates
- Periodic background sync
- Advanced cache strategies (e.g., cache-then-network)
- Cache analytics and monitoring
- Selective caching based on user preferences
