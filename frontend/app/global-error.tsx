'use client';

import { useEffect, useState } from 'react';
import { nukeStaleClientState } from '@/lib/nukeStaleClientState';

const MAX_AUTO_ATTEMPTS = 3;
const RELOAD_DELAY_MS = 1500;
const NUKE_COOLDOWN_MS = 5000;

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [autoRecoverFailed, setAutoRecoverFailed] = useState(false);

  useEffect(() => {
    console.error('[app/global-error]', error);

    const msg = error?.message || String(error);
    const isStaleClient =
      /ChunkLoadError|Loading chunk|Failed to (?:load|fetch dynamically imported|register a ServiceWorker)|Failed to find Server Action/i.test(
        msg
      );

    if (typeof window === 'undefined') return;

    // Stale client → nuke (lihat catatan di error.tsx soal cooldown vs flag).
    if (isStaleClient) {
      const lastNuke = parseInt(sessionStorage.getItem('last-nuke-ts') || '0', 10);
      if (Date.now() - lastNuke > NUKE_COOLDOWN_MS) {
        sessionStorage.setItem('last-nuke-ts', String(Date.now()));
        void nukeStaleClientState();
        return;
      }
    }

    const key = `global-auto-recover-${error?.digest || 'unknown'}`;
    const current = parseInt(sessionStorage.getItem(key) || '0', 10);

    if (current >= MAX_AUTO_ATTEMPTS) {
      setAutoRecoverFailed(true);
      return;
    }
    sessionStorage.setItem(key, String(current + 1));

    const resetTimer = setTimeout(() => {
      try { reset(); } catch { /* ignore */ }
    }, 50);
    const reloadTimer = setTimeout(() => {
      window.location.reload();
    }, RELOAD_DELAY_MS);

    return () => {
      clearTimeout(resetTimer);
      clearTimeout(reloadTimer);
    };
  }, [error, reset]);

  if (autoRecoverFailed) {
    return (
      <html lang="id">
        <body style={{ fontFamily: 'system-ui, sans-serif', background: '#fafaf9', margin: 0 }}>
          <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div style={{ maxWidth: 480, width: '100%', background: '#fff', border: '1px solid #e7e5e4', borderRadius: 8, padding: 24, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
              <h1 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 8px', color: '#1c1917' }}>Aplikasi gagal dimuat</h1>
              <p style={{ fontSize: 14, color: '#57534e', margin: '0 0 16px' }}>
                Sudah coba muat ulang beberapa kali tapi belum berhasil. Bersihkan cache untuk membantu.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => nukeStaleClientState()} style={{ padding: '8px 16px', background: '#1c1917', color: '#fff', border: 0, borderRadius: 6, fontSize: 14, cursor: 'pointer' }}>
                  Bersihkan & muat ulang
                </button>
                <a href="/" style={{ padding: '8px 16px', background: '#f5f5f4', color: '#1c1917', borderRadius: 6, fontSize: 14, textDecoration: 'none', display: 'inline-block' }}>
                  Ke beranda
                </a>
              </div>
            </div>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="id">
      <body style={{ fontFamily: 'system-ui, sans-serif', background: '#fafaf9', margin: 0 }}>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <div style={{ width: 40, height: 40, border: '2px solid #e7e5e4', borderTopColor: '#44403c', borderRadius: '50%', animation: 'ilena-spin 0.8s linear infinite' }} />
          <p style={{ fontSize: 14, color: '#78716c', margin: 0 }}>Memuat ulang halaman...</p>
          <style dangerouslySetInnerHTML={{ __html: '@keyframes ilena-spin{to{transform:rotate(360deg)}}' }} />
        </div>
      </body>
    </html>
  );
}
