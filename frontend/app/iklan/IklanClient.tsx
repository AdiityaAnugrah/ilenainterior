'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Box,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Compass,
  LayoutGrid,
  MessageCircle,
  Quote,
  ShieldCheck,
  Sofa,
  Sparkles,
  Star,
  Users,
  Wand2,
} from 'lucide-react';
import api from '@/lib/api';

const painPoints = [
  {
    icon: CircleDollarSign,
    title: 'Takut biaya desain membengkak',
    desc: 'Banyak orang ingin lihat gambaran dulu, tapi langsung ketemu biaya konsultasi tinggi.',
  },
  {
    icon: AlertCircle,
    title: 'Ragu ukuran furniture cocok',
    desc: 'Di foto terlihat pas, tapi saat tiba di rumah ternyata terlalu besar atau terlalu kecil.',
  },
  {
    icon: Compass,
    title: 'Sulit membayangkan hasil akhir',
    desc: 'Pilihan warna, material, dan layout sering terasa abstrak sebelum dicoba langsung.',
  },
];

const productFeatures = [
  {
    icon: LayoutGrid,
    title: 'Planner 2D Presisi',
    desc: 'Atur ukuran ruang, pintu, jendela, lalu drag & drop furniture asli ILENA dengan cepat.',
    bullets: ['Ukuran berbasis meter', 'Auto-snap penempatan', 'Cocok untuk draft awal'],
  },
  {
    icon: Box,
    title: 'Visualisasi 3D Realistis',
    desc: 'Lihat proporsi ruangan dari berbagai sudut untuk mengurangi risiko salah beli.',
    bullets: ['View perspektif penuh', 'Preview material dinding', 'Cek skala furniture'],
  },
  {
    icon: Compass,
    title: 'Mode Walk-through',
    desc: 'Masuk ke ruangan virtual seperti simulasi agar keputusan lebih yakin.',
    bullets: ['Sudut pandang orang berdiri', 'Rasa ruang lebih nyata', 'Lebih mudah validasi layout'],
  },
  {
    icon: MessageCircle,
    title: 'Follow-up WhatsApp Langsung',
    desc: 'Setelah desain jadi, tim ILENA bantu review dan lanjutkan ke proses pemesanan.',
    bullets: ['Konsultasi cepat', 'Bahas revisi desain', 'Lanjut order lebih terarah'],
  },
];

const workflow = [
  { step: '01', title: 'Atur Ruangan', desc: 'Masukkan ukuran dan tipe ruanganmu di planner.' },
  { step: '02', title: 'Pilih Produk', desc: 'Drag furniture, atur posisi, lalu sesuaikan material.' },
  { step: '03', title: 'Preview 3D', desc: 'Validasi tampilan di mode 3D dan walk-through.' },
  { step: '04', title: 'Konsultasi WA', desc: 'Kirim desainmu dan dapatkan arahan sebelum checkout.' },
];

const highlights = [
  { value: 'Gratis', label: 'Akses planner' },
  { value: '2D + 3D', label: 'Mode visual' },
  { value: 'Interactive', label: 'Preview layout' },
  { value: '1-on-1', label: 'Bantuan via WA' },
];

const testimonials = [
  {
    name: 'Rina A.',
    location: 'Jakarta Selatan',
    text: 'Saya jadi berani order karena bisa cek ukuran sofa dulu di 3D. Hasil akhirnya mirip banget dengan simulasi.',
  },
  {
    name: 'Bagas P.',
    location: 'Bandung',
    text: 'Paling membantu saat bingung kombinasi warna dinding dan furniture. Tinggal share desain ke tim lewat WhatsApp.',
  },
  {
    name: 'Maya L.',
    location: 'Surabaya',
    text: 'Walk-through bikin saya paham alur ruangnya. Revisi jadi lebih cepat dan keputusan beli lebih yakin.',
  },
];

export default function IklanPage() {
  const [waNumber, setWaNumber] = useState('');
  const [waMessage, setWaMessage] = useState('Halo Ilena, mau tanya tanya koleksinya.');

  useEffect(() => {
    api
      .get('/api/wallpapers/settings/whatsapp')
      .then((r) => {
        setWaNumber(r.data.whatsapp_number || '');
        setWaMessage(r.data.whatsapp_message || 'Halo Ilena, mau tanya tanya koleksinya.');
      })
      .catch(() => {});
  }, []);

  const waUrl = useMemo(() => {
    if (!waNumber) return '#';
    const text = encodeURIComponent(waMessage || 'Halo Ilena, mau tanya tanya koleksinya.');
    return `https://wa.me/${waNumber.replace(/[^0-9]/g, '')}?text=${text}`;
  }, [waNumber, waMessage]);

  const waDisabled = waUrl === '#';

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-stone-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-8">
          <Link href="/iklan" className="leading-none">
            <p className="font-display text-lg font-semibold tracking-wide">
              ILENA <span className="text-warm-500">INTERIOR</span>
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-stone-400">
              Visual Planner Experience
            </p>
          </Link>
          <div className="hidden items-center gap-2 sm:flex">
            <Link
              href="/planner"
              className="inline-flex items-center gap-1 rounded-lg border border-stone-300 px-3 py-2 text-xs font-medium text-stone-700 transition hover:border-stone-500 hover:text-stone-900"
            >
              Coba Planner <ArrowRight size={14} />
            </Link>
            <a
              data-kbot-wa
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold text-white transition ${
                waDisabled ? 'bg-stone-400 pointer-events-none' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <MessageCircle size={14} /> Konsultasi
            </a>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden px-5 pb-16 pt-28 md:px-8 md:pt-36">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -left-20 top-16 h-72 w-72 rounded-full bg-warm-200/70 blur-3xl" />
          <div className="absolute -right-16 top-28 h-80 w-80 rounded-full bg-stone-300/60 blur-3xl" />
        </div>

        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-700">
              <Sparkles size={13} /> Gratis, langsung di browser
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-tight md:text-6xl">
              Desain Ruangan Lebih
              <span className="ml-2 italic text-warm-500">Yakin</span>,
              <br />
              Sebelum Kamu Checkout
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-stone-600 md:text-lg">
              ILENA Planner membantumu menyusun layout, mencoba furniture asli, dan melihat hasil
              dalam 3D. Lanjutkan konsultasi via WhatsApp untuk membuka rekomendasi paling cocok
              untuk ruangmu.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/planner"
                className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-stone-700"
              >
                Mulai Desain Sekarang <ArrowRight size={16} />
              </Link>
              <a
                data-kbot-wa
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition ${
                  waDisabled ? 'bg-stone-400 pointer-events-none' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                <MessageCircle size={16} /> Konsultasi via WhatsApp
              </a>
            </div>

            <div className="mt-8 grid max-w-xl grid-cols-2 gap-2 sm:grid-cols-4">
              {highlights.map((h) => (
                <div key={h.label} className="rounded-xl border border-stone-200 bg-white px-3 py-3 text-center">
                  <p className="text-sm font-semibold text-stone-900">{h.value}</p>
                  <p className="mt-1 text-[11px] text-stone-500">{h.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-warm-200/40 to-stone-300/40 blur-2xl" />
            <div className="relative rounded-3xl border border-stone-200 bg-white p-4 shadow-2xl shadow-stone-300/40">
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <span className="rounded-full bg-stone-900 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
                    Live Planner
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                    <CheckCircle2 size={12} /> Interactive Preview
                  </span>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-xl border border-stone-200 bg-white p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">Mode 2D</p>
                    <p className="mt-2 text-sm font-medium">Atur denah & posisi furniture</p>
                    <div className="mt-3 h-24 rounded-lg border border-dashed border-stone-300 bg-stone-50" />
                  </div>
                  <div className="rounded-xl border border-stone-200 bg-white p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">Mode 3D</p>
                    <p className="mt-2 text-sm font-medium">Validasi skala dan suasana ruang</p>
                    <div className="mt-3 flex h-24 items-center justify-center rounded-lg bg-gradient-to-br from-stone-200 to-stone-300 text-stone-500">
                      <Sofa size={26} />
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-xs font-semibold text-emerald-800">Preview awal sudah siap dilihat</p>
                  <p className="mt-1 text-[11px] text-emerald-700">
                    Detail rekomendasi final dibuka saat konsultasi dengan tim ILENA via WhatsApp.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-stone-200 bg-white px-5 py-16 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-warm-600">Problem di Lapangan</p>
            <h2 className="mt-2 font-display text-3xl font-bold md:text-5xl">
              Kenapa Banyak Orang
              <span className="ml-2 italic text-stone-400">Tertahan</span> Saat Mau Upgrade Ruangan
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {painPoints.map((item) => (
              <div key={item.title} className="rounded-2xl border border-stone-200 bg-stone-50 p-6">
                <div className="mb-4 inline-flex rounded-xl border border-stone-200 bg-white p-2.5">
                  <item.icon size={18} className="text-warm-600" />
                </div>
                <h3 className="font-display text-xl font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-16 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-warm-600">Fitur Utama</p>
            <h2 className="mt-2 font-display text-3xl font-bold md:text-5xl">
              Planner yang Dibangun
              <span className="ml-2 italic text-stone-400">Untuk Keputusan Nyata</span>
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {productFeatures.map((feature) => (
              <div key={feature.title} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                <div className="mb-4 inline-flex rounded-xl bg-stone-900 p-2.5 text-white">
                  <feature.icon size={18} />
                </div>
                <h3 className="font-display text-2xl font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{feature.desc}</p>
                <ul className="mt-4 space-y-1.5">
                  {feature.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-center gap-2 text-sm text-stone-700">
                      <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-stone-900 px-5 py-16 text-white md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-warm-300">Alur Penggunaan</p>
            <h2 className="mt-2 font-display text-3xl font-bold md:text-5xl">
              Dari Ide ke Order
              <span className="ml-2 italic text-warm-300">Tanpa Ribet</span>
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            {workflow.map((item) => (
              <div key={item.step} className="rounded-2xl border border-stone-700 bg-stone-800 p-5">
                <p className="text-xs font-semibold tracking-widest text-warm-300">{item.step}</p>
                <h3 className="mt-2 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-stone-300">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-16 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-warm-600">Kepercayaan Pelanggan</p>
            <h2 className="mt-2 font-display text-3xl font-bold md:text-5xl">
              Pengguna Merasa
              <span className="ml-2 italic text-stone-400">Lebih Pasti</span> Sebelum Beli
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {testimonials.map((t) => (
              <div key={t.name} className="rounded-2xl border border-stone-200 bg-stone-50 p-6">
                <Quote size={22} className="text-warm-400" />
                <p className="mt-3 text-sm leading-relaxed text-stone-700">&ldquo;{t.text}&rdquo;</p>
                <div className="mt-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-stone-900">{t.name}</p>
                    <p className="text-xs text-stone-500">{t.location}</p>
                  </div>
                  <div className="flex items-center gap-1 text-amber-500">
                    <Star size={14} fill="currentColor" />
                    <Star size={14} fill="currentColor" />
                    <Star size={14} fill="currentColor" />
                    <Star size={14} fill="currentColor" />
                    <Star size={14} fill="currentColor" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-gradient-to-b from-stone-100 to-warm-50 px-5 py-20 md:px-8">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-warm-200/40 blur-3xl" />
        <div className="relative mx-auto max-w-4xl text-center">
          <Sparkles size={24} className="mx-auto text-warm-500" />
          <h2 className="mt-4 font-display text-4xl font-bold leading-tight md:text-6xl">
            Siap Lihat Ruanganmu
            <br />
            <span className="italic text-warm-500">Sebelum Ambil Keputusan?</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base text-stone-600 md:text-lg">
            Coba planner gratis untuk menyusun layout, lalu lanjut konsultasi untuk melihat
            rekomendasi final yang paling pas dengan ruangmu.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/planner"
              className="inline-flex items-center gap-2 rounded-xl bg-stone-900 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-stone-700"
            >
              Coba Planner Gratis <ArrowRight size={16} />
            </Link>
            <a
              data-kbot-wa
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-sm font-semibold text-white transition ${
                waDisabled ? 'bg-stone-400 pointer-events-none' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <MessageCircle size={16} /> Chat WhatsApp
            </a>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-5 text-xs text-stone-500">
            <span className="inline-flex items-center gap-1.5">
              <Clock3 size={14} className="text-stone-700" /> Respons cepat
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-stone-700" /> Produk terkurasi
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users size={14} className="text-stone-700" /> Bantuan tim ILENA
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Wand2 size={14} className="text-stone-700" /> Simulasi lebih realistis
            </span>
          </div>
        </div>
      </section>

      <footer className="bg-stone-950 px-5 py-7 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 md:flex-row">
          <p className="font-display text-base font-semibold text-white tracking-wide">ILENA INTERIOR</p>
          <p className="text-xs text-stone-500">
            (c) {new Date().getFullYear()} ILENA INTERIOR. Desain lebih yakin, beli lebih tenang.
          </p>
        </div>
      </footer>

      <a
        data-kbot-wa
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat WhatsApp"
        className={`fixed bottom-5 right-5 z-50 rounded-full p-4 text-white shadow-2xl transition hover:scale-105 ${
          waDisabled
            ? 'bg-stone-400 pointer-events-none'
            : 'bg-emerald-600 shadow-emerald-500/30 hover:bg-emerald-700'
        }`}
      >
        <MessageCircle size={22} />
      </a>
    </div>
  );
}
