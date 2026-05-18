'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[app/error]', error);

    // Auto-recover dari ChunkLoadError (terjadi kalau user buka tab lama
    // setelah deploy baru — chunk hash-nya sudah berubah). Reload sekali,
    // dijaga sessionStorage supaya tidak loop.
    const msg = error?.message || String(error);
    if (/ChunkLoadError|Loading chunk|Failed to (?:load|fetch dynamically imported)/i.test(msg)) {
      if (!sessionStorage.getItem('chunk-reload-attempted')) {
        sessionStorage.setItem('chunk-reload-attempted', '1');
        window.location.reload();
      }
    }
  }, [error]);

  const isDev = process.env.NODE_ENV !== 'production';

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow border border-stone-200 p-6">
        <h1 className="text-xl font-semibold text-stone-900 mb-2">
          Terjadi kesalahan
        </h1>
        <p className="text-sm text-stone-600 mb-4">
          Halaman ini gagal dimuat. Coba muat ulang — kalau masih, kembali ke beranda.
        </p>

        {isDev && (
          <pre className="text-xs bg-stone-100 text-stone-800 rounded p-3 mb-4 overflow-auto max-h-40">
            {error?.message}
            {error?.digest ? `\n\ndigest: ${error.digest}` : ''}
          </pre>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-stone-900 text-white text-sm font-medium rounded-md hover:bg-stone-800 transition-colors"
          >
            Coba lagi
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-stone-100 text-stone-800 text-sm font-medium rounded-md hover:bg-stone-200 transition-colors"
          >
            Muat ulang halaman
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
