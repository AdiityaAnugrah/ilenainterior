// Kill-switch Service Worker
// Replaces the previous caching service worker. Whenever an old client
// installs/activates this version, it deletes every cache and
// unregisters itself, then forces all open tabs to reload with a fresh
// network fetch. This is needed because the previous SW was caching
// stale JS chunks and intercepting the app's API URLs.
//
// Version is bumped on every change so browsers detect the byte-diff
// and run the update path.
const KILL_SWITCH_VERSION = 'kill-switch-2026-05-16';

self.addEventListener('install', (event) => {
  // Take over immediately - do not wait for old SW to release control.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      // 1. Delete every cache this origin owns.
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));

      // 2. Unregister self.
      await self.registration.unregister();

      // 3. Force every open client to reload from the network.
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) {
        // navigate() bypasses any cached HTML/JS.
        try {
          await client.navigate(client.url);
        } catch (e) {
          // Some clients (cross-origin) cannot be navigated; ignore.
        }
      }
    } catch (err) {
      // Swallow errors - we are best-effort cleanup.
      console.error('[KillSwitchSW] cleanup failed:', err);
    }
  })());
});

// Pass through every request untouched - never intercept.
self.addEventListener('fetch', () => {
  // Intentionally do not call event.respondWith() - the browser
  // performs the default network fetch.
});
