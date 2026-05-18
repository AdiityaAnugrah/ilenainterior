'use client';

import { useEffect, useState } from 'react';
import { nukeStaleClientState } from '@/lib/nukeStaleClientState';

const MAX_AUTO_ATTEMPTS = 3;
const RELOAD_DELAY_MS = 1200;
// Rate-limit nuke per error type (jangan double-fire rapid, tapi jangan
// blokir nuke selamanya kayak flag boolean sebelumnya).
const NUKE_COOLDOWN_MS = 5000;

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [attempt, setAttempt] = useState(0);
  const [autoRecoverFailed, setAutoRecoverFailed] = useState(false);

  useEffect(() => {
    console.error('[app/error]', error);

    const msg = error?.message || String(error);
    const isStaleClient =
      /ChunkLoadError|Loading chunk|Failed to (?:load|fetch dynamically imported|register a ServiceWorker)|Failed to find Server Action/i.test(
        msg
      );

    // Stale client (ChunkLoadError dkk): WAJIB nuke — chunk udah gak ada di
    // server, plain reload gak akan fix. Sebelumnya pakai flag boolean
    // sessionStorage yang gak pernah dibersihin → nuke kedua gak jalan dan
    // user stuck di error. Sekarang pakai timestamp + cooldown 5s biar
    // tetap aman dari rapid double-fire tapi gak blokir nuke selamanya.
    if (isStaleClient) {
      const lastNuke = parseInt(sessionStorage.getItem('last-nuke-ts') || '0', 10);
      if (Date.now() - lastNuke > NUKE_COOLDOWN_MS) {
        sessionStorage.setItem('last-nuke-ts', String(Date.now()));
        void nukeStaleClientState();
        return;
      }
      // Dalam cooldown → fall through ke auto-reload generic.
    }

    // Counter recovery attempt — per error digest agar reset terhitung kalau
    // berhasil pulih (digest beda atau halaman beda).
    const key = `auto-recover-${error?.digest || 'unknown'}`;
    const current = parseInt(sessionStorage.getItem(key) || '0', 10);

    if (current >= MAX_AUTO_ATTEMPTS) {
      // Sudah gagal recover beberapa kali — kasih UI manual ke user.
      setAutoRecoverFailed(true);
      return;
    }

    sessionStorage.setItem(key, String(current + 1));
    setAttempt(current + 1);

    // Strategi recovery dua tahap:
    // 1. Coba reset() dulu (rekonsiliasi React, no full reload, lebih cepat)
    // 2. Kalau dalam ~1.2 detik komponen masih ke-mount = reset gagal,
    //    lakukan full window reload (lebih agresif, hampir selalu berhasil).
    let resetTried = false;
    const resetTimer = setTimeout(() => {
      try { reset(); resetTried = true; } catch { /* ignore */ }
    }, 50);

    const reloadTimer = setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }, RELOAD_DELAY_MS);

    return () => {
      clearTimeout(resetTimer);
      clearTimeout(reloadTimer);
      // Kalau component berhasil unmount sebelum reload timer (artinya reset
      // berhasil), reset counter biar attempt selanjutnya fresh.
      if (resetTried) {
        sessionStorage.removeItem(key);
      }
    };
  }, [error, reset]);

  // UI manual hanya muncul setelah MAX_AUTO_ATTEMPTS gagal
  if (autoRecoverFailed) {
    const isDev = process.env.NODE_ENV !== 'production';
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow border border-stone-200 p-6">
          <h1 className="text-xl font-semibold text-stone-900 mb-2">Halaman gagal dimuat</h1>
          <p className="text-sm text-stone-600 mb-4">
            Kami sudah coba muat ulang beberapa kali tapi belum berhasil. Coba bersihkan cache atau kembali ke beranda.
          </p>
          {isDev && (
            <pre className="text-xs bg-stone-100 text-stone-800 rounded p-3 mb-4 overflow-auto max-h-40">
              {error?.message}
              {error?.digest ? `\n\ndigest: ${error.digest}` : ''}
            </pre>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => nukeStaleClientState()}
              className="px-4 py-2 bg-stone-900 text-white text-sm font-medium rounded-md hover:bg-stone-800 transition-colors"
            >
              Bersihkan & muat ulang
            </button>
            <a
              href="/"
              className="px-4 py-2 bg-stone-100 text-stone-800 text-sm font-medium rounded-md hover:bg-stone-200 transition-colors"
            >
              Ke beranda
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Default: minimal spinner — user-friendly, gak kelihatan kayak error
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-stone-200 border-t-stone-700 rounded-full animate-spin" />
        <p className="text-sm text-stone-500">
          Memuat ulang halaman{attempt > 1 ? ` (percobaan ${attempt})` : ''}...
        </p>
      </div>
    </div>
  );
}
