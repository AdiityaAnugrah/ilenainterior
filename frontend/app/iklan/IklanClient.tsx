'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Sparkles,
  Sofa,
  Layers,
  Wand2,
  ShieldCheck,
  Clock,
  Smile,
  MessageCircle,
  CheckCircle2,
  Box,
  Compass,
  Frown,
  DollarSign,
  AlertCircle,
  Quote,
} from 'lucide-react';
import api from '@/lib/api';

const problems = [
  {
    icon: DollarSign,
    title: 'Jasa Desainer Mahal',
    desc: 'Konsultasi interior bisa habiskan jutaan, padahal cuma butuh gambaran kasar dulu.',
  },
  {
    icon: AlertCircle,
    title: 'Beli Furniture, Tidak Cocok',
    desc: 'Sofanya kebesaran, warnanya tabrakan dengan dinding. Telanjur dibeli, susah retur.',
  },
  {
    icon: Frown,
    title: 'Susah Bayangin Hasilnya',
    desc: 'Lihat di foto bagus, sampai rumah ternyata beda. Layout ruangan jadi sumber stres.',
  },
];

const pillars = [
  {
    icon: Wand2,
    title: 'Desain Sendiri, Gratis',
    desc: 'Drag & drop furniture asli ILENA ke denah ruanganmu. Tanpa skill desain, tanpa biaya.',
  },
  {
    icon: Box,
    title: 'Lihat dalam 3D & Walk-through',
    desc: 'Switch ke mode 3D, jalan-jalan virtual di ruanganmu. Yakin sebelum bayar.',
  },
  {
    icon: MessageCircle,
    title: 'Konsultasi WhatsApp',
    desc: 'Desainmu siap? Kirim ke tim ILENA, langsung dibantu sampai pesanan tiba.',
  },
];

const modes = [
  {
    icon: Layers,
    badge: 'Mode 2D',
    title: 'Denah Cepat & Akurat',
    desc: 'Mulai dari ukuran ruangan, tambah tembok, pintu, jendela. Drag furniture ke posisi yang pas.',
    bullets: ['Ukuran presisi cm', 'Library furniture asli', 'Auto-snap & alignment'],
  },
  {
    icon: Box,
    badge: 'Mode 3D',
    title: 'Visualisasi Realistis',
    desc: 'Lihat ruanganmu dari sudut manapun. Kombinasi material, warna, dan pencahayaan auto-render.',
    bullets: ['Lighting siang & malam', 'Material PBR realistis', 'Render instan'],
  },
  {
    icon: Compass,
    badge: 'Walk-through',
    title: 'Masuk ke Ruangan Virtual',
    desc: 'Jalan-jalan di dalam ruangan virtual seperti game. Cek skala dan suasana sebelum pesan.',
    bullets: ['Kontrol WASD/mouse', 'POV first-person', 'Rasa ruang yang nyata'],
  },
];

const testimonials = [
  {
    name: 'Rina A.',
    location: 'Jakarta Selatan',
    text: 'Awalnya iseng coba, tapi ternyata bisa lihat sofanya dari semua sisi dalam 3D. Akhirnya pesan langsung, hasilnya persis seperti yang dirancang.',
    color: '#d4956b',
  },
  {
    name: 'Bagas P.',
    location: 'Bandung',
    text: 'Ngebantu banget buat ngecek ukuran sebelum beli. Tim WA-nya juga responsif, langsung kasih saran kombinasi material yang cocok.',
    color: '#a86339',
  },
];

export default function IklanPage() {
  const [waNumber, setWaNumber] = useState('');

  useEffect(() => {
    api.get('/api/wallpapers/settings/whatsapp')
      .then((r) => setWaNumber(r.data.whatsapp_number || ''))
      .catch(() => {});
  }, []);

  const waText = encodeURIComponent(
    'Halo ILENA, saya tertarik untuk konsultasi desain ruangan saya. Bisa minta info lebih lanjut?'
  );
  const waUrl = waNumber ? `https://wa.me/${waNumber.replace(/[^0-9]/g, '')}?text=${waText}` : '#';

  return (
    <div className="min-h-screen bg-stone-50 overflow-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/85 backdrop-blur-md border-b border-stone-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/iklan" className="flex flex-col leading-none">
            <span className="font-display text-lg font-semibold text-stone-900 tracking-wide">
              ILENA <span className="text-warm-500">INTERIOR</span>
            </span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-stone-400 mt-1">
              Modern · Estetik · Premium
            </span>
          </Link>
          <Link
            href="/planner"
            className="hidden sm:inline-flex items-center gap-2 bg-stone-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-stone-800 transition-colors"
          >
            Mulai Desain <ArrowRight size={14} />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-28 md:pt-36 pb-16 px-6">
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute top-20 -left-32 w-96 h-96 bg-warm-100 rounded-full blur-3xl opacity-70" />
          <div className="absolute top-40 -right-20 w-96 h-96 bg-stone-200 rounded-full blur-3xl opacity-60" />
        </div>

        <div className="max-w-5xl mx-auto text-center mb-8">
          <span className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full border border-emerald-100">
            <Sparkles size={14} /> Gratis · Tanpa Akun · Konsultasi WA Aktif
          </span>
        </div>

        <div className="max-w-5xl mx-auto text-center">
          <h1 className="font-display text-5xl md:text-7xl font-bold text-stone-900 leading-[1.05] mb-6">
            Bikin Ruangan Impianmu,
            <br />
            <span className="text-warm-500 italic">Tanpa Pusing Desain</span>
          </h1>

          <p className="text-lg md:text-xl text-stone-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            Drag & drop furniture asli ILENA ke denah ruanganmu, lihat hasilnya dalam 3D,
            lalu chat tim kami via WhatsApp untuk lanjut order.{' '}
            <span className="font-semibold text-stone-800">Semua gratis, langsung di browser.</span>
          </p>

          <div className="flex items-center justify-center gap-3 flex-wrap mb-6">
            <Link
              href="/planner"
              className="inline-flex items-center gap-2 bg-stone-900 text-white font-medium px-8 py-4 rounded-xl hover:bg-stone-800 transition-all hover:scale-105 text-base shadow-xl shadow-stone-300/50"
            >
              Mulai Desain Gratis <ArrowRight size={18} />
            </Link>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-emerald-600 text-white font-medium px-8 py-4 rounded-xl hover:bg-emerald-700 transition-all text-base shadow-lg shadow-emerald-200/50"
            >
              <MessageCircle size={18} /> Konsultasi WhatsApp
            </a>
          </div>

          <div className="flex items-center justify-center gap-6 text-xs text-stone-500 flex-wrap">
            <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-500" /> Tanpa Download</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-500" /> Tanpa Akun</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-500" /> Furniture Asli</span>
          </div>
        </div>

        {/* Hero visual */}
        <div className="max-w-5xl mx-auto mt-14">
          <div className="relative">
            <div className="absolute inset-0 -m-4 bg-gradient-to-br from-warm-100 via-stone-100 to-stone-200 rounded-3xl blur-2xl opacity-60" />
            <div className="relative bg-white rounded-3xl border border-stone-200 shadow-2xl shadow-stone-300/40 overflow-hidden aspect-video">
              <div className="absolute inset-0 bg-gradient-to-br from-stone-100 via-warm-50 to-stone-200 flex items-center justify-center">
                <div className="text-center text-stone-400">
                  <Sofa size={80} strokeWidth={1} className="mx-auto mb-4 text-stone-300" />
                  <p className="font-display text-2xl text-stone-500 mb-1">Preview Ruanganmu</p>
                  <p className="text-sm text-stone-400">2D · 3D · Walk-through</p>
                </div>
              </div>
              <div className="absolute top-4 left-4 bg-white/95 backdrop-blur px-3 py-1.5 rounded-lg shadow-md border border-stone-100 flex items-center gap-1.5 text-xs font-medium text-stone-700">
                <Layers size={14} className="text-warm-500" /> Mode 3D Aktif
              </div>
              <div className="absolute bottom-4 right-4 bg-stone-900 text-white px-3 py-1.5 rounded-lg shadow-lg text-xs font-medium">
                Walk-through ready
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem statement */}
      <section className="px-6 py-20 bg-white border-y border-stone-100">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold uppercase tracking-widest text-warm-600">Masalah Yang Sering Terjadi</span>
            <h2 className="font-display text-3xl md:text-5xl font-bold text-stone-900 mt-2 mb-4">
              Mau Desain Ruangan,
              <br /><span className="italic text-stone-400">Tapi Bingung Mulai Dari Mana?</span>
            </h2>
            <p className="text-stone-500 max-w-2xl mx-auto">
              Tiga hal ini yang paling sering kami dengar dari pelanggan sebelum mencoba planner ILENA.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {problems.map((p, i) => (
              <div key={i} className="bg-stone-50 rounded-2xl p-7 border border-stone-100">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mb-5 border border-stone-200">
                  <p.icon size={22} className="text-warm-600" />
                </div>
                <h3 className="font-display text-lg font-semibold text-stone-900 mb-2">{p.title}</h3>
                <p className="text-sm text-stone-500 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution pillars */}
      <section className="px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold uppercase tracking-widest text-warm-600">Solusi ILENA</span>
            <h2 className="font-display text-3xl md:text-5xl font-bold text-stone-900 mt-2 mb-4">
              Satu Halaman,
              <br /><span className="italic text-stone-400">Tiga Kemudahan</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {pillars.map((p, i) => (
              <div key={i} className="group bg-white rounded-2xl p-7 border border-stone-100 hover:border-warm-200 hover:shadow-xl hover:shadow-warm-100/40 transition-all">
                <div className="w-12 h-12 bg-stone-900 rounded-xl flex items-center justify-center mb-5 group-hover:bg-warm-500 transition-colors">
                  <p.icon size={22} className="text-white" />
                </div>
                <h3 className="font-display text-xl font-semibold text-stone-900 mb-2">{p.title}</h3>
                <p className="text-stone-500 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mode showcase */}
      <section className="px-6 py-20 bg-gradient-to-b from-stone-50 to-warm-50/40">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold uppercase tracking-widest text-warm-600">Tiga Cara Lihat Ruanganmu</span>
            <h2 className="font-display text-3xl md:text-5xl font-bold text-stone-900 mt-2 mb-4">
              Dari Denah ke <span className="italic text-stone-400">Walk-through</span>
            </h2>
            <p className="text-stone-500 max-w-xl mx-auto">
              Mulai dari layout sederhana sampai jalan-jalan virtual di ruangan impianmu — semua dalam satu tool.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {modes.map((m, i) => (
              <div key={i} className="bg-white rounded-2xl border border-stone-100 shadow-sm hover:shadow-xl transition-shadow overflow-hidden flex flex-col">
                <div className="aspect-[4/3] bg-gradient-to-br from-stone-100 via-warm-50 to-stone-200 flex items-center justify-center relative">
                  <m.icon size={56} strokeWidth={1} className="text-stone-300" />
                  <span className="absolute top-4 left-4 bg-white/95 backdrop-blur px-3 py-1 rounded-full shadow-sm border border-stone-100 text-[11px] font-semibold uppercase tracking-widest text-warm-600">
                    {m.badge}
                  </span>
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <h3 className="font-display text-xl font-semibold text-stone-900 mb-2">{m.title}</h3>
                  <p className="text-sm text-stone-500 leading-relaxed mb-4">{m.desc}</p>
                  <ul className="space-y-1.5 mb-5">
                    {m.bullets.map((b, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm text-stone-600">
                        <CheckCircle2 size={14} className="text-emerald-500 shrink-0" /> {b}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/planner"
                    className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-stone-900 hover:text-warm-600 transition-colors"
                  >
                    Coba mode ini <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold uppercase tracking-widest text-warm-600">Kata Pelanggan</span>
            <h2 className="font-display text-3xl md:text-5xl font-bold text-stone-900 mt-2">
              Mereka Sudah <span className="italic text-stone-400">Membuktikannya</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-stone-50 rounded-2xl p-7 border border-stone-100">
                <Quote size={28} className="text-warm-300 mb-3" />
                <p className="text-stone-700 leading-relaxed mb-5">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                  <div>
                    <p className="font-semibold text-stone-900 text-sm">{t.name}</p>
                    <p className="text-xs text-stone-500">{t.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-24 bg-stone-900 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-warm-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-3xl mx-auto text-center relative">
          <Sparkles size={28} className="mx-auto text-warm-400 mb-5" />
          <h2 className="font-display text-4xl md:text-6xl font-bold text-white mb-5 leading-tight">
            Jangan Tunggu Sampai
            <br />
            <span className="text-warm-400 italic">Furniture Salah Beli</span>
          </h2>
          <p className="text-stone-300 mb-10 text-lg max-w-xl mx-auto">
            Rancang dulu, baru pesan. Mulai gratis sekarang atau chat tim ILENA langsung di WhatsApp.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/planner"
              className="inline-flex items-center gap-2 bg-white text-stone-900 font-semibold px-8 py-4 rounded-xl hover:bg-warm-50 transition-all hover:scale-105 shadow-xl"
            >
              Mulai Desain Gratis <ArrowRight size={18} />
            </Link>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-emerald-600 text-white font-semibold px-8 py-4 rounded-xl hover:bg-emerald-500 transition-all hover:scale-105 shadow-xl"
            >
              <MessageCircle size={18} /> Chat WhatsApp
            </a>
          </div>

          <div className="flex items-center justify-center gap-6 text-xs text-stone-400 mt-8 flex-wrap">
            <span className="flex items-center gap-1.5"><Clock size={14} /> Respon cepat</span>
            <span className="flex items-center gap-1.5"><ShieldCheck size={14} /> Produk berkualitas</span>
            <span className="flex items-center gap-1.5"><Smile size={14} /> Tanpa biaya tersembunyi</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-950 px-6 py-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <span className="font-display text-base font-semibold text-white tracking-wide">
            ILENA INTERIOR
          </span>
          <p className="text-xs text-stone-500">
            © {new Date().getFullYear()} ILENA INTERIOR — Modern · Estetik · Premium
          </p>
        </div>
      </footer>

      {/* Floating WhatsApp */}
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat WhatsApp"
        className="fixed bottom-6 right-6 z-50 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full p-4 shadow-2xl shadow-emerald-500/40 hover:scale-110 transition-all flex items-center gap-2 group"
      >
        <MessageCircle size={24} />
        <span className="hidden group-hover:inline pr-2 font-medium text-sm whitespace-nowrap">
          Chat sekarang
        </span>
      </a>
    </div>
  );
}
