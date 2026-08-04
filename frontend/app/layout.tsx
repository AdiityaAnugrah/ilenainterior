import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { ServiceWorkerProvider } from '@/components/ServiceWorkerProvider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ilenainterior.com';
const TRACKING_SETTINGS_URL =
  process.env.TRACKING_SETTINGS_URL ||
  process.env.INTERNAL_API_URL?.replace(/\/api\/?$/, '/api/wallpapers/settings/public') ||
  'http://localhost:5000/api/wallpapers/settings/public';

type TrackingSettings = {
  google_tag_manager_id?: string;
  google_analytics_id?: string;
  tiktok_pixel_id?: string;
  meta_pixel_id?: string;
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'ILENA INTERIOR | Rancang Ruanganmu',
    template: '%s | ILENA INTERIOR',
  },
  description: 'Desain interior impianmu secara virtual. Atur furniture, lihat dalam 3D, dan langsung beli.',
  // Manifest di-link otomatis oleh konvensi file app/manifest.ts
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ILENA',
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

// Next 16: viewport dipisah dari metadata. width/initial-scale default sudah
// device-width; kita sengaja TIDAK mematikan zoom global demi aksesibilitas —
// halaman planner mencegah pinch lewat `touch-action: none` di canvasnya.
export const viewport: Viewport = {
  themeColor: '#1c1917',
  colorScheme: 'light',
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

function cleanId(value: unknown, pattern: RegExp): string {
  const id = typeof value === 'string' ? value.trim() : '';
  return pattern.test(id) ? id : '';
}

async function getTrackingSettings(): Promise<TrackingSettings> {
  try {
    const res = await fetch(TRACKING_SETTINGS_URL, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}

function googleTagManagerScript(id: string) {
  return `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${id}');`;
}

function googleAnalyticsScript(id: string) {
  return `window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());
gtag('config','${id}');`;
}

function tiktokPixelScript(id: string) {
  return `!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=i+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
  ttq.load('${id}');
  ttq.page();
}(window, document, 'ttq');`;
}

function metaPixelScript(id: string) {
  return `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${id}');
fbq('track', 'PageView');`;
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getTrackingSettings();
  const gtmId = cleanId(settings.google_tag_manager_id, /^GTM-[A-Z0-9]+$/i);
  const gaId = cleanId(settings.google_analytics_id, /^G-[A-Z0-9]+$/i);
  const tiktokId = cleanId(settings.tiktok_pixel_id, /^[A-Z0-9]{8,}$/i);
  const metaId = cleanId(settings.meta_pixel_id, /^[0-9]{6,30}$/);

  return (
    <html lang="id" className={`${inter.variable} ${playfair.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: swCleanupScript }} />
        {gtmId && <script dangerouslySetInnerHTML={{ __html: googleTagManagerScript(gtmId) }} />}
        {gaId && <script async src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} />}
        {gaId && <script dangerouslySetInnerHTML={{ __html: googleAnalyticsScript(gaId) }} />}
        {tiktokId && <script dangerouslySetInnerHTML={{ __html: tiktokPixelScript(tiktokId) }} />}
        {metaId && <script dangerouslySetInnerHTML={{ __html: metaPixelScript(metaId) }} />}
      </head>
      <body className="font-sans bg-stone-50 text-stone-900 antialiased">
        {gtmId && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
        )}
        {metaId && (
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              style={{ display: 'none' }}
              src={`https://www.facebook.com/tr?id=${metaId}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        )}
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
