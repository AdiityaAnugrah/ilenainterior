'use client';

import { useEffect, useState } from 'react';
import { ServiceWorkerManager } from '@/app/register-sw';
import { nukeStaleClientState } from '@/lib/nukeStaleClientState';

const NUKE_COOLDOWN_MS = 5000;

/**
 * Service Worker Provider Component
 * Handles service worker registration and update notifications
 */
export function ServiceWorkerProvider({ children }: { children: React.ReactNode }) {
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);
  const [swManager, setSwManager] = useState<ServiceWorkerManager | null>(null);

  // Auto-recover from ChunkLoadError after a deploy.
  // When the server rotates its chunks, any tab still running the
  // previous build will 404 on dynamic imports. Catch that here and
  // reload once (guarded by sessionStorage so we don't loop).
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onChunkError = (msg: string) => {
      if (!/ChunkLoadError|Loading chunk|Failed to load chunk/i.test(msg)) {
        return;
      }
      // Pakai cooldown timestamp (bukan flag boolean) supaya nuke berikutnya
      // setelah cooldown lewat tetap bisa jalan. Plain reload sebelumnya
      // gak fix kalau HTML masih reference chunk hash yang udah hilang —
      // wajib nuke (clear caches + unregister SW + reload bypass cache).
      const lastNuke = parseInt(sessionStorage.getItem('last-nuke-ts') || '0', 10);
      if (Date.now() - lastNuke < NUKE_COOLDOWN_MS) return;
      sessionStorage.setItem('last-nuke-ts', String(Date.now()));
      void nukeStaleClientState();
    };

    const errorHandler = (e: ErrorEvent) => onChunkError(e.message || '');
    const rejectionHandler = (e: PromiseRejectionEvent) => {
      const reason = e.reason;
      const msg =
        (reason && (reason.message || String(reason))) || '';
      onChunkError(msg);
    };

    window.addEventListener('error', errorHandler);
    window.addEventListener('unhandledrejection', rejectionHandler);

    return () => {
      window.removeEventListener('error', errorHandler);
      window.removeEventListener('unhandledrejection', rejectionHandler);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // Aggressively tear down any existing service worker.
    //
    // The previous SW (public/sw.js) was caching stale JS chunks and
    // serving them across deploys, which broke the app after we
    // changed lib/api.ts. We do NOT register any new SW; instead we:
    //   1. Look up every existing registration
    //   2. Force a one-shot update (server now sends Clear-Site-Data
    //      header on /sw.js so the browser wipes its cache when it
    //      fetches the new file)
    //   3. Unregister the worker so it never controls the page again
    //
    // After all known visitors have been cleaned up we can delete this
    // file and remove the <ServiceWorkerProvider> wrapper.
    (async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          try { await reg.update(); } catch { /* ignore */ }
          try { await reg.unregister(); } catch { /* ignore */ }
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const handleUpdate = () => {
    // swManager is no longer used (kill-switch handles itself), but we
    // keep the handler so the JSX below still compiles. Reload to pick
    // up the latest assets.
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
    setShowUpdateNotification(false);
    void swManager; // silence unused-var lint
  };

  const handleDismiss = () => {
    setShowUpdateNotification(false);
  };

  return (
    <>
      {children}
      
      {/* Update Notification */}
      {showUpdateNotification && (
        <div className="fixed bottom-4 right-4 z-50 max-w-md bg-white rounded-lg shadow-lg border border-stone-200 p-4 animate-slide-up">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <svg
                className="w-5 h-5 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
            
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-stone-900 mb-1">
                Update Available
              </h3>
              <p className="text-sm text-stone-600 mb-3">
                A new version of ILENA INTERIOR is available. Refresh to get the latest features and improvements.
              </p>
              
              <div className="flex gap-2">
                <button
                  onClick={handleUpdate}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                >
                  Update Now
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2 bg-stone-100 text-stone-700 text-sm font-medium rounded-md hover:bg-stone-200 transition-colors"
                >
                  Later
                </button>
              </div>
            </div>
            
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-stone-400 hover:text-stone-600 transition-colors"
              aria-label="Close"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
