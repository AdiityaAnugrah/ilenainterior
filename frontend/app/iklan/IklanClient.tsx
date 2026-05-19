'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Sparkles,
  Sofa,
  Layers,
  Eye,
  Wand2,
  ShieldCheck,
  Clock,
  Smile,
  MessageCircle,
  CheckCircle2,
  Palette,
  Zap,
} from 'lucide-react';
import api from '@/lib/api';

const features = [
  {
    icon: Wand2,
    title: 'Rancang Sendiri, Tanpa Ribet',
    desc: 'Drag & drop furniture asli ke denah ruanganmu. Tidak perlu skill desain — kamu yang pegang kendali.',
  },
  {
    icon: Eye,
    title: 'Lihat Sebelum Beli',
    desc: 'Switch ke mode 3D dan walk-through. Jalan-jalan virtual di ruanganmu sebelum keputusan dibuat.',
  },
  {
    icon: Palette,
    title: 'Material & Warna Realistis',
    desc: 'Coba kombinasi lantai, dinding, dan kain sofa sampai dapat tampilan yang sempurna.',
  },
  {
    icon: MessageCircle,
    title: 'Konsultasi Langsung WhatsApp',
    desc: 'Desainmu siap? Kirim sekali klik ke tim kami, langsung dibantu sampai pesanan tiba.',
  },
];

const reasons = [
  { icon: Zap, title: 'Hemat Waktu', desc: 'Tak perlu bolak-balik ke toko. Desain selesai dalam 15 menit.' },
  { icon: ShieldCheck, title: 'Produk Asli', desc: 'Setiap item di katalog adalah produk ILENA yang siap dikirim.' },
  { icon: Smile, title: 'Konsultasi Gratis', desc: 'Tim desainer siap bantu wujudkan ide ruanganmu, gratis.' },
];

const steps = [
  { num: '01', title: 'Buat Ruangan', desc: 'Masukkan ukuran ruangan dalam hitungan detik.' },
  { num: '02', title: 'Tata & Pilih Material', desc: 'Drag furniture, pilih warna, semua langsung terlihat.' },
  { num: '03', title: 'Lihat 3D & Konsultasi', desc: 'Preview hasilnya, lalu chat WA untuk lanjut order.' },
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
      {/* Minimal nav khusus iklan */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/85 backdrop-blur-md border-b border-stone-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/iklan" className="font-display text-xl font-semibold text-stone-900 tracking-wide">
            ILENA <span className="text-warm-500">INTERIOR</span>
          </Link>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-2 bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <MessageCircle size={16} />
            Chat WhatsApp
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-28 md:pt-36 pb-16 px-6">
        {/* Soft warm gradient backdrop */}
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute top-20 -left-32 w-96 h-96 bg-warm-100 rounded-full blur-3xl opacity-70" />
          <div className="absolute top-40 -right-20 w-96 h-96 bg-stone-200 rounded-full blur-3xl opacity-60" />
        </div>

        <div className="max-w-5xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 bg-warm-100 text-warm-600 text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6">
            <Sparkles size={14} /> Gratis · Langsung di Browser
          </span>

          <h1 className="font-display text-5xl md:text-7xl font-bold text-stone-900 leading-[1.05] mb-6">
            Desain Interior
            <br />
            <span className="text-warm-500 italic">Seindah Mimpimu</span>
          </h1>

          <p className="text-lg md:text-xl text-stone-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            Rancang ruangan impian dengan furniture asli, lihat hasilnya dalam 3D,
            lalu konsultasi langsung dengan tim kami via WhatsApp.{' '}
            <span className="font-semibold text-stone-800">Tidak perlu desainer mahal.</span>
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
            <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-emerald-500" /> 100% Gratis</span>
          </div>
        </div>

        {/* Hero visual mockup */}
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
              {/* Floating badges */}
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

      {/* Trust strip */}
      <section className="px-6 py-12 bg-white border-y border-stone-100">
        <div className="max-w-5xl mx-auto grid grid-cols-3 gap-6 text-center">
          {reasons.map((r, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="w-12 h-12 bg-warm-50 rounded-xl flex items-center justify-center mb-3">
                <r.icon size={22} className="text-warm-600" />
              </div>
              <h3 className="font-semibold text-stone-800 text-sm md:text-base mb-1">{r.title}</h3>
              <p className="text-xs md:text-sm text-stone-500 max-w-[200px]">{r.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold uppercase tracking-widest text-warm-600">Fitur Unggulan</span>
            <h2 className="font-display text-3xl md:text-5xl font-bold text-stone-900 mt-2 mb-4">
              Semua yang Kamu Perlu,
              <br /><span className="text-stone-400 italic">dalam Satu Layar</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {features.map((f, i) => (
              <div
                key={i}
                className="group bg-white rounded-2xl p-7 border border-stone-100 hover:border-warm-200 hover:shadow-xl hover:shadow-warm-100/40 transition-all"
              >
                <div className="w-12 h-12 bg-stone-900 rounded-xl flex items-center justify-center mb-5 group-hover:bg-warm-500 transition-colors">
                  <f.icon size={22} className="text-white" />
                </div>
                <h3 className="font-display text-xl font-semibold text-stone-900 mb-2">{f.title}</h3>
                <p className="text-stone-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-20 bg-gradient-to-b from-stone-50 to-warm-50/40">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold uppercase tracking-widest text-warm-600">Cara Kerja</span>
            <h2 className="font-display text-3xl md:text-5xl font-bold text-stone-900 mt-2 mb-4">
              3 Langkah, <span className="italic text-stone-400">Selesai</span>
            </h2>
            <p className="text-stone-500 max-w-xl mx-auto">
              Tidak ada kursus, tidak ada tutorial panjang. Mulai sekarang juga.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((s, i) => (
              <div
                key={i}
                className="relative bg-white rounded-2xl p-7 border border-stone-100 shadow-sm hover:shadow-lg transition-shadow"
              >
                <div className="absolute -top-4 -left-2 font-display text-7xl font-bold text-warm-100 select-none leading-none">
                  {s.num}
                </div>
                <div className="relative pt-8">
                  <h3 className="font-display text-xl font-semibold text-stone-900 mb-2">{s.title}</h3>
                  <p className="text-sm text-stone-500 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/planner"
              className="inline-flex items-center gap-2 bg-stone-900 text-white font-medium px-8 py-4 rounded-xl hover:bg-stone-800 transition-all hover:scale-105 shadow-lg shadow-stone-300/50"
            >
              Coba Sekarang, Gratis <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Social proof / testimonial */}
      <section className="px-6 py-20 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex -space-x-2 mb-6">
            {['#d4956b', '#a86339', '#78716c', '#44403c', '#c17b4e'].map((c, i) => (
              <div
                key={i}
                className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <p className="text-sm text-stone-500 mb-8">
            Bergabung dengan ratusan pelanggan yang sudah mewujudkan ruangan impian
          </p>

          <blockquote className="font-display text-2xl md:text-3xl text-stone-800 italic leading-relaxed max-w-3xl mx-auto">
            &ldquo;Awalnya cuma iseng coba, tapi ternyata bisa lihat sofanya dari semua sisi
            dalam 3D. Akhirnya pesan langsung, hasilnya persis seperti yang dirancang.&rdquo;
          </blockquote>
          <p className="mt-6 text-sm font-medium text-stone-600">— Pelanggan ILENA INTERIOR</p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-24 bg-stone-900 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-warm-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-3xl mx-auto text-center relative">
          <Sparkles size={28} className="mx-auto text-warm-400 mb-5" />
          <h2 className="font-display text-4xl md:text-6xl font-bold text-white mb-5 leading-tight">
            Ruangan Impianmu
            <br />
            <span className="text-warm-400 italic">Tinggal Selangkah Lagi</span>
          </h2>
          <p className="text-stone-300 mb-10 text-lg max-w-xl mx-auto">
            Mulai gratis di browser, atau chat tim kami langsung di WhatsApp.
            Tidak ada biaya tersembunyi.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/planner"
              className="inline-flex items-center gap-2 bg-white text-stone-900 font-semibold px-8 py-4 rounded-xl hover:bg-warm-50 transition-all hover:scale-105 shadow-xl"
            >
              Mulai Desain <ArrowRight size={18} />
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
            <span className="flex items-center gap-1.5"><Smile size={14} /> Pelanggan puas</span>
          </div>
        </div>
      </section>

      {/* Footer minimal */}
      <footer className="bg-stone-950 px-6 py-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <span className="font-display text-base font-semibold text-white tracking-wide">
            ILENA INTERIOR
          </span>
          <p className="text-xs text-stone-500">
            © {new Date().getFullYear()} ILENA INTERIOR — Desain Interior Modern
          </p>
        </div>
      </footer>

      {/* Floating WhatsApp button */}
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
