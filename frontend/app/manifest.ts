import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ILENA INTERIOR — Rancang Ruanganmu',
    short_name: 'ILENA',
    description: 'Desain interior virtual: atur furniture, lihat 3D & walk-through, konsultasi via WhatsApp.',
    start_url: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#fafaf9',
    theme_color: '#1c1917',
    lang: 'id',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
