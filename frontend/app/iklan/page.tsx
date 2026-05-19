import type { Metadata } from 'next';
import IklanClient from './IklanClient';

const TITLE = 'ILENA INTERIOR — Desain Interior Virtual Gratis, Lihat dalam 3D';
const DESCRIPTION =
  'Rancang ruangan impianmu dengan furniture asli ILENA. Drag & drop, lihat dalam 2D, 3D, dan walk-through, lalu konsultasi langsung via WhatsApp. Gratis, langsung di browser.';
const URL = 'https://ilenainterior.com/iklan';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    'desain interior',
    'room planner',
    'furniture online',
    'desain ruangan 3D',
    'konsultasi interior',
    'ILENA INTERIOR',
    'wallpaper',
    'sofa custom',
    'planner 5D indonesia',
  ],
  alternates: {
    canonical: URL,
  },
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: URL,
    siteName: 'ILENA INTERIOR',
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function IklanPage() {
  return <IklanClient />;
}
