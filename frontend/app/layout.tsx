import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { ServiceWorkerProvider } from '@/components/ServiceWorkerProvider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ilenainterior.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'ILENA INTERIOR | Rancang Ruanganmu',
    template: '%s | ILENA INTERIOR',
  },
  description: 'Desain interior impianmu secara virtual. Atur furniture, lihat dalam 3D, dan langsung beli.',
};

// Inline early-cleanup script. Sengaja TIDAK pakai chunk/import supaya
// jalan walau bundle lain belum/gagal load. Begitu HTML fresh sampai ke
// browser, ini langsung unregister SW basi sebelum SW lama sempat balik
// intercept request. Idempotent — kalau sudah tidak ada SW, no-op.
const swCleanupScript = `(function(){
  try {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.getRegistrations().then(function(regs){
      if (!regs || !regs.length) return;
      regs.forEach(function(reg){
        try { reg.unregister(); } catch(e) {}
      });
      try {
        if (window.caches && caches.keys) {
          caches.keys().then(function(keys){
            keys.forEach(function(k){ caches.delete(k); });
          });
        }
      } catch(e) {}
      // Kalau halaman ini ke-serve oleh SW (controller != null), reload
      // sekali untuk memastikan asset di-fetch ulang dari network.
      if (navigator.serviceWorker.controller && !sessionStorage.getItem('sw-cleanup-reload')) {
        sessionStorage.setItem('sw-cleanup-reload', '1');
        location.reload();
      }
    });
  } catch(e) {}
})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${inter.variable} ${playfair.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: swCleanupScript }} />
      </head>
      <body className="font-sans bg-stone-50 text-stone-900 antialiased">
        <ServiceWorkerProvider>
          {children}
        </ServiceWorkerProvider>
        <Toaster
          position="top-right"
          toastOptions={{ style: { fontSize: '14px' } }}
        />
      </body>
    </html>
  );
}
