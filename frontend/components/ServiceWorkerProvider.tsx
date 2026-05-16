'use client';

import { useEffect, useState } from 'react';
import { ServiceWorkerManager } from '@/app/register-sw';

/**
 * Service Worker Provider Component
 * Handles service worker registration and update notifications
 */
export function ServiceWorkerProvider({ children }: { children: React.ReactNode }) {
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);
  const [swManager, setSwManager] = useState<ServiceWorkerManager | null>(null);

  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') {
      return;
    }

    // Service Worker is currently disabled.
    //
    // A previous SW (public/sw.js) was caching stale JS chunks and
    // serving them across deploys, which broke the app's API URL
    // handling after we changed lib/api.ts. The new sw.js is a
    // kill-switch that unregisters itself and clears all caches.
    //
    // We still register the kill-switch so existing visitors can be
    // cleaned up, but we no longer use ServiceWorkerManager (which
    // would try to keep it alive). Once everyone has been cleaned up
    // we can drop this registration entirely.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          // Force immediate update check so the kill-switch version is
          // fetched on the very next visit.
          registration.update().catch(() => {});
        })
        .catch(() => {
          // Ignore registration errors - nothing we can do here.
        });
    }

    return () => {
      // No cleanup needed.
    };
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
