import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' });

export const metadata: Metadata = {
  title: 'ILENA INTERIOR — Rancang Ruanganmu',
  description: 'Desain interior impianmu secara virtual. Atur furniture, lihat dalam 3D, dan langsung beli.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${inter.variable} ${playfair.variable}`}>
      <body className="font-sans bg-stone-50 text-stone-900 antialiased">
          {children}
        <Toaster
          position="top-right"
          toastOptions={{ style: { fontSize: '14px' } }}
        />
      </body>
    </html>
  );
}
