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

    // Initialize service worker manager
    const manager = new ServiceWorkerManager({
      onSuccess: (registration) => {
        console.log('[App] Service Worker registered successfully');
      },
      onUpdate: (registration) => {
        console.log('[App] New service worker available');
        setShowUpdateNotification(true);
      },
      onError: (error) => {
        console.error('[App] Service Worker registration failed:', error);
      },
      enableAutoUpdate: true,
      updateInterval: 60000, // Check every 60 seconds
    });

    setSwManager(manager);

    // Register service worker
    manager.register();

    // Cleanup on unmount
    return () => {
      // Don't unregister on unmount, just stop update checks
    };
  }, []);

  const handleUpdate = () => {
    if (swManager) {
      swManager.skipWaiting();
      setShowUpdateNotification(false);
    }
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
