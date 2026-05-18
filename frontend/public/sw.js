// Kill-switch Service Worker v2
//
// Tugasnya 1 hal saja: matikan diri sendiri dan semua cache, lalu paksa
// semua tab nge-reload dari network. Tidak pernah meng-intercept fetch.
//
// Browser akan fetch /sw.js secara periodik untuk update check. Begitu
// browser detect byte-diff dari versi tersimpan, dia install yang baru.
// Versi di-bump tiap perubahan supaya browser yakin ini file beda.
const KILL_SWITCH_VERSION = 'kill-switch-2026-05-18-v2';

self.addEventListener('install', (event) => {
  // Skip waiting → langsung pindah ke fase activate tanpa nunggu
  // SW lama melepas kontrol. Penting supaya browser yg stuck dengan SW
  // basi cepat ke-bersihin.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      // 1. Hapus semua cache milik origin ini.
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    } catch (err) {
      // ignore
    }

    try {
      // 2. Ambil semua client (tab) yg masih hidup SEBELUM unregister,
      //    supaya bisa di-reload setelah self-unregister selesai.
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

      // 3. Unregister diri sendiri.
      try { await self.registration.unregister(); } catch (e) { /* ignore */ }

      // 4. Reload tiap client supaya HTML & asset di-fetch ulang dari
      //    network (bukan dari SW yg barusan dimatikan).
      for (const client of clients) {
        try {
          await client.navigate(client.url);
        } catch (e) {
          // beberapa client tidak bisa di-navigate (cross-origin) — skip
        }
      }
    } catch (err) {
      // ignore
    }
  })());
});

// Pass-through: jangan pernah intercept request. Browser akan handle
// fetch secara default seperti tanpa SW.
self.addEventListener('fetch', () => {
  // intentionally empty
});

// Beberapa SW lama mengirim `SKIP_WAITING` message untuk activate paksa.
// Kita honor request itu supaya transisi mulus.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Reference KILL_SWITCH_VERSION supaya minifier tidak buang konstanta.
void KILL_SWITCH_VERSION;
