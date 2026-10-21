'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

type PixelFunction = ((...args: unknown[]) => void) & { queue?: unknown[][]; callMethod?: (...args: unknown[]) => void; loaded?: boolean; version?: string; push?: PixelFunction };
declare global { interface Window { fbq?: PixelFunction; _fbq?: PixelFunction } }

export function MetaPageView({ pixelId, pageViewEnabled = true, leadEnabled = true }: { pixelId: string; pageViewEnabled?: boolean; leadEnabled?: boolean }) {
  const pathname = usePathname();
  const previous = useRef('');
  const initialized = useRef('');
  useEffect(() => {
    if (!pathname || /^\/(admin|login|register)(\/|$)/.test(pathname) || !/^\d{6,30}$/.test(pixelId)) return;
    const key = `${pixelId}:${pathname}:${pageViewEnabled}`;
    if (previous.current === key) return;
    previous.current = key;
    if (!window.fbq) {
      const fbq: PixelFunction = (...args) => { if (fbq.callMethod) fbq.callMethod(...args); else fbq.queue!.push(args); };
      fbq.queue = []; fbq.loaded = true; fbq.version = '2.0'; fbq.push = fbq;
      window.fbq = fbq; window._fbq = fbq;
      const script = document.createElement('script');
      script.async = true; script.src = 'https://connect.facebook.net/en_US/fbevents.js';
      document.head.appendChild(script);
    }
    if (initialized.current !== pixelId) { window.fbq('init', pixelId); initialized.current = pixelId; }
    if (!pageViewEnabled) return;
    const eventId = crypto.randomUUID();
    window.fbq('trackSingle', pixelId, 'PageView', {}, { eventID: eventId });
    const cookie = (name: string) => document.cookie.split('; ').find(item => item.startsWith(`${name}=`))?.slice(name.length + 1);
    void fetch('/api/meta/page-view', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
      body: JSON.stringify({ event_id: eventId, event_source_url: location.origin + pathname, fbp: cookie('_fbp'), fbc: cookie('_fbc') }),
    }).catch(() => { /* Tracking failures must not interrupt navigation. */ });
  }, [pathname, pixelId, pageViewEnabled]);
  useEffect(() => {
    if (!pathname || /^\/(admin|login|register)(\/|$)/.test(pathname) || !/^\d{6,30}$/.test(pixelId)) return;
    if (!leadEnabled) return;
    // Delegation also covers consultation links rendered later by the planner.
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || !(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>('a[href]');
      if (!link || link.getAttribute('aria-disabled') === 'true') return;
      const url = new URL(link.href, location.origin);
      if (url.protocol !== 'https:' || url.username || url.password) return;
      const isWhatsApp = (url.hostname === 'wa.me' && /^\/\d+\/?$/.test(url.pathname)) ||
        (url.hostname === 'api.whatsapp.com' && url.pathname === '/send' && /^\d+$/.test(url.searchParams.get('phone') || ''));
      if (!isWhatsApp) return;
      try {
        const eventId = crypto.randomUUID();
        window.fbq?.('trackSingle', pixelId, 'Lead', {}, { eventID: eventId });
        const cookie = (name: string) => document.cookie.split('; ').find(item => item.startsWith(`${name}=`))?.slice(name.length + 1);
        void fetch('/api/meta/lead', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
          body: JSON.stringify({ event_id: eventId, event_source_url: location.origin + pathname, fbp: cookie('_fbp'), fbc: cookie('_fbc') }),
        }).catch(() => { /* Tracking must not block WhatsApp. */ });
      } catch { /* WhatsApp navigation remains independent of tracking. */ }
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [pathname, pixelId, leadEnabled]);
  return null;
}
