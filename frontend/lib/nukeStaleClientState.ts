/**
 * Unregister semua Service Worker, hapus semua Cache API entries, lalu
 * reload halaman dengan bypass cache.
 *
 * Dipakai ketika kita yakin browser dalam state basi (chunk 404,
 * ChunkLoadError, SW corrupt). Setelah `unregister()`, fetch berikutnya
 * tidak lagi diintercept oleh SW lama — jadi reload akan ambil HTML +
 * asset segar dari network.
 *
 * Tidak menyentuh localStorage / cookies supaya user tidak ke-logout.
 */
export async function nukeStaleClientState(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        regs.map(async (reg) => {
          try {
            await reg.unregister();
          } catch {
            /* ignore */
          }
        })
      );
    }
  } catch {
    /* ignore */
  }

  try {
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(
        names.map((name) =>
          caches.delete(name).catch(() => {
            /* ignore */
          })
        )
      );
    }
  } catch {
    /* ignore */
  }

  // Cache-busting query param memaksa reload bypass HTTP cache & SW
  // (kalau ada yang belum keburu mati).
  const url = new URL(window.location.href);
  url.searchParams.set('_r', Date.now().toString(36));
  window.location.replace(url.toString());
}
