'use client';

import { useEffect } from 'react';
import { nukeStaleClientState } from '@/lib/nukeStaleClientState';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[app/global-error]', error);

    const msg = error?.message || String(error);
    const isStaleClient =
      /ChunkLoadError|Loading chunk|Failed to (?:load|fetch dynamically imported|register a ServiceWorker)|Failed to find Server Action/i.test(
        msg
      );

    if (
      isStaleClient &&
      typeof window !== 'undefined' &&
      !sessionStorage.getItem('nuke-attempted')
    ) {
      sessionStorage.setItem('nuke-attempted', '1');
      void nukeStaleClientState();
    }
  }, [error]);

  return (
    <html lang="id">
      <body style={{ fontFamily: 'system-ui, sans-serif', background: '#fafaf9', margin: 0 }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            style={{
              maxWidth: 480,
              width: '100%',
              background: '#fff',
              border: '1px solid #e7e5e4',
              borderRadius: 8,
              padding: 24,
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}
          >
            <h1 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 8px', color: '#1c1917' }}>
              Terjadi kesalahan
            </h1>
            <p style={{ fontSize: 14, color: '#57534e', margin: '0 0 16px' }}>
              Aplikasi gagal dimuat. Klik tombol di bawah untuk membersihkan & memuat ulang.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => reset()}
                style={{
                  padding: '8px 16px',
                  background: '#1c1917',
                  color: '#fff',
                  border: 0,
                  borderRadius: 6,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Coba lagi
              </button>
              <button
                onClick={() => nukeStaleClientState()}
                style={{
                  padding: '8px 16px',
                  background: '#f5f5f4',
                  color: '#1c1917',
                  border: 0,
                  borderRadius: 6,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Bersihkan & muat ulang
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
