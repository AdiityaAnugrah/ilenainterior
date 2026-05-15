import Link from 'next/link';
import { ArrowRight, Sofa, Eye, MessageCircle, Layers } from 'lucide-react';
import Navbar from '@/components/ui/Navbar';
import ResumeDesignBanner from '@/components/ui/ResumeDesignBanner';

const features = [
  {
    icon: Layers,
    title: 'Input Ukuran Ruangan',
    desc: 'Masukkan lebar, panjang, dan tinggi ruangan. Denah otomatis terbentuk.',
  },
  {
    icon: Sofa,
    title: 'Tata Furniture Drag & Drop',
    desc: 'Pilih dari ratusan produk asli, taruh di denah, rotate, dan atur posisi.',
  },
  {
    icon: Eye,
    title: 'Lihat dalam 2D, 3D, & Walk-through',
    desc: 'Switch tampilan kapan saja. Jalan-jalan virtual di ruangan rancanganmu.',
  },
  {
    icon: MessageCircle,
    title: 'Konsultasi via WhatsApp',
    desc: 'Suka desainnya? Langsung kirim ke WhatsApp untuk konsultasi dan pemesanan.',
  },
];

const steps = [
  { num: '01', title: 'Buat Ruangan', desc: 'Input dimensi & pilih tipe ruangan' },
  { num: '02', title: 'Tata Furniture', desc: 'Drag dari katalog ke denah' },
  { num: '03', title: 'Pilih Material', desc: 'Ganti warna lantai, dinding, kain sofa' },
  { num: '04', title: 'Lihat & Konsultasi', desc: 'Preview 3D & konsultasi via WhatsApp' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-stone-50">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block bg-warm-100 text-warm-600 text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-6">
            Room Planner Interaktif
          </span>
          <h1 className="font-display text-5xl md:text-7xl font-bold text-stone-900 leading-tight mb-6">
            Rancang Ruangan
            <br />
            <span className="text-stone-400">Impianmu</span>
          </h1>
          <p className="text-lg text-stone-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Desain interior virtual dengan produk asli ILENA. Atur furniture, pilih wallpaper, lihat dalam 3D,
            jalan-jalan di ruanganmu — lalu konsultasi langsung via WhatsApp.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/planner"
              className="inline-flex items-center gap-2 bg-stone-800 text-white font-medium px-8 py-4 rounded-xl hover:bg-stone-700 transition-colors text-base shadow-lg shadow-stone-200"
            >
              Mulai Desain Gratis <ArrowRight size={18} />
            </Link>
            <Link
              href="/catalog"
              className="inline-flex items-center gap-2 border border-stone-200 text-stone-700 font-medium px-8 py-4 rounded-xl hover:bg-stone-100 transition-colors text-base"
            >
              Lihat Katalog
            </Link>
          </div>
          <p className="text-xs text-stone-400 mt-4">Gratis · Tidak perlu akun · Desktop only</p>
        </div>
      </section>

      <ResumeDesignBanner />

      {/* Preview mockup area */}
      <section className="px-6 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xl overflow-hidden aspect-video flex items-center justify-center">
            <div className="text-center text-stone-300">
              <Layers size={64} strokeWidth={1} className="mx-auto mb-4" />
              <p className="text-lg font-medium">Preview Editor</p>
              <p className="text-sm">Screenshot atau demo video diletakkan di sini</p>
            </div>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-stone-900 mb-3">
              4 Langkah Mudah
            </h2>
            <p className="text-stone-500">Dari ide ke desain siap konsultasi, semua dalam satu tempat.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {steps.map((step, i) => (
              <div key={i} className="relative">
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-[60%] right-0 h-px bg-stone-200" />
                )}
                <div className="relative">
                  <span className="font-display text-5xl font-bold text-stone-100 select-none">
                    {step.num}
                  </span>
                  <div className="-mt-4">
                    <h3 className="font-semibold text-stone-800 mb-1">{step.title}</h3>
                    <p className="text-sm text-stone-500">{step.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 bg-stone-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-stone-900 mb-3">
              Semua yang Kamu Butuhkan
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((f, i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-stone-100 hover:border-stone-200 hover:shadow-sm transition-all">
                <div className="w-10 h-10 bg-stone-100 rounded-lg flex items-center justify-center mb-4">
                  <f.icon size={20} className="text-stone-600" />
                </div>
                <h3 className="font-semibold text-stone-800 mb-2">{f.title}</h3>
                <p className="text-sm text-stone-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Bottom */}
      <section className="px-6 py-20 bg-stone-900">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
            Siap merancang ruangan impianmu?
          </h2>
          <p className="text-stone-400 mb-8">Gratis, langsung di browser. Tidak perlu download apapun.</p>
          <Link
            href="/planner"
            className="inline-flex items-center gap-2 bg-white text-stone-900 font-semibold px-8 py-4 rounded-xl hover:bg-stone-100 transition-colors text-base"
          >
            Mulai Sekarang <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-900 border-t border-stone-800 px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-display text-lg font-semibold text-white tracking-wide">ILENA INTERIOR</span>
          <div className="flex gap-6 text-sm text-stone-500">
            <Link href="/catalog" className="hover:text-stone-300 transition-colors">Katalog</Link>
            <Link href="/login" className="hover:text-stone-300 transition-colors">Masuk</Link>
            <Link href="/register" className="hover:text-stone-300 transition-colors">Daftar</Link>
          </div>
          <p className="text-xs text-stone-600">© 2024 ILENA INTERIOR. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
