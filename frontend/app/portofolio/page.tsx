import Link from 'next/link';
import { ArrowUpRight, ExternalLink, Image as ImageIcon, Play } from 'lucide-react';
import Navbar from '@/components/ui/Navbar';

const photoSlots = [
  { label: 'Sudut ruang' },
  { label: 'Detail furnitur' },
  { label: 'Material dan tekstur' },
];

function MediaPlaceholder({ label, wide = false }: { label: string; wide?: boolean }) {
  return (
    <div
      aria-label={`${label}; dokumentasi akan ditambahkan`}
      role="img"
      className={`relative flex ${wide ? 'aspect-[16/10]' : 'aspect-[4/3]'} items-center justify-center overflow-hidden bg-[#e4e9df]`}
    >
      <div aria-hidden="true" className="absolute inset-5 border border-[#c8d2c5] sm:inset-7" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/3 bg-[#d5dfd3]" />
      <div aria-hidden="true" className="relative flex flex-col items-center gap-3 text-[#355b4c]">
        <ImageIcon size={28} strokeWidth={1.4} />
        <span className="text-xs font-semibold sm:text-sm">{label}</span>
      </div>
      <span className="absolute bottom-8 right-8 text-xs font-medium text-[#405849]">Materi menyusul</span>
    </div>
  );
}

export default function PortfolioPage() {
  return (
    <div className="min-h-screen bg-[#f6f7f2] text-stone-900">
      <Navbar />

      <main>
        <header className="px-5 pb-12 pt-28 sm:px-8 sm:pb-16 sm:pt-36">
          <div className="mx-auto max-w-7xl">
            <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#315d4c]">
              <span className="h-px w-8 bg-[#315d4c]" />
              ILENA INTERIOR
            </p>
            <div className="grid gap-6 md:grid-cols-[1fr_0.6fr] md:items-end">
              <h1 className="max-w-3xl font-display text-4xl font-semibold leading-[1.08] tracking-tight text-[#183c35] sm:text-6xl">
                Portofolio ruang dan cerita di baliknya.
              </h1>
              <p className="max-w-lg text-base leading-7 text-stone-700 md:justify-self-end">
                Lihat koleksi proyek, pilihan furnitur, dan detail yang membentuk setiap ruang. Foto, tautan proyek, serta video akan ditambahkan bertahap.
              </p>
            </div>
          </div>
        </header>

        <section aria-labelledby="featured-title" className="px-5 pb-16 sm:px-8 sm:pb-20">
          <div className="mx-auto max-w-7xl">
            <div className="mb-5 flex items-end justify-between gap-4 border-b border-[#cbd2c8] pb-4">
              <div>
                <p className="text-sm font-semibold text-[#315d4c]">Proyek pilihan</p>
                <h2 id="featured-title" className="mt-1 font-display text-2xl font-semibold text-[#183c35] sm:text-3xl">Ruang unggulan</h2>
              </div>
              <span className="hidden text-sm text-stone-600 sm:block">Format proyek siap diisi</span>
            </div>

            <article className="grid overflow-hidden border border-[#d7ddd3] bg-white lg:grid-cols-[1.2fr_0.8fr]">
              <MediaPlaceholder label="Foto utama proyek" wide />
              <div className="flex flex-col justify-center px-6 py-8 sm:px-9 sm:py-10">
                <p className="text-sm font-semibold text-[#315d4c]">Dokumentasi proyek</p>
                <h3 className="mt-3 font-display text-2xl font-semibold text-[#183c35] sm:text-3xl">Cerita ruang akan dimulai di sini.</h3>
                <p className="mt-4 max-w-md text-sm leading-6 text-stone-700">
                  Area ini disiapkan untuk foto utama, nama proyek, lokasi, dan cerita singkat setelah materi tersedia.
                </p>
                <div className="mt-7 flex items-center gap-2 border-t border-stone-200 pt-4 text-sm text-stone-700">
                  <ExternalLink size={16} aria-hidden="true" />
                  <span>Tautan studi proyek menyusul</span>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section aria-labelledby="gallery-title" className="bg-white px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 max-w-2xl sm:mb-10">
              <p className="mb-3 text-sm font-semibold text-[#315d4c]">Galeri proyek</p>
              <h2 id="gallery-title" className="font-display text-3xl font-semibold leading-tight text-[#183c35] sm:text-4xl">
                Detail yang membuat ruang terasa personal.
              </h2>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {photoSlots.map((slot) => (
                <article key={slot.label} className="border border-[#d7ddd3] bg-[#f6f7f2]">
                  <MediaPlaceholder label={slot.label} />
                  <div className="flex items-center justify-between gap-3 px-4 py-4">
                    <h3 className="text-sm font-semibold text-[#183c35]">{slot.label}</h3>
                    <span className="text-xs text-stone-600">Foto menyusul</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="video-title" className="px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-center lg:gap-14">
            <div>
              <p className="mb-3 text-sm font-semibold text-[#315d4c]">Video tur ruang</p>
              <h2 id="video-title" className="font-display text-3xl font-semibold leading-tight text-[#183c35] sm:text-4xl">
                Lihat ruang dari sudut yang berbeda.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-6 text-stone-700 sm:text-base sm:leading-7">
                Area ini siap untuk embed video tur proyek. Tautan video dapat ditambahkan saat sudah tersedia.
              </p>
            </div>
            <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-[#183c35] px-6 text-center text-white">
              <div aria-hidden="true" className="absolute inset-5 border border-white/25 sm:inset-8" />
              <div className="relative flex flex-col items-center">
                <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-white/60 text-[#e8c77d]">
                  <Play size={22} fill="currentColor" aria-hidden="true" />
                </span>
                <p className="font-semibold">Embed video proyek</p>
                <p className="mt-1 text-sm text-[#e1e9df]">Video menyusul</p>
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 pb-16 sm:px-8 sm:pb-20">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 border-t border-[#cbd2c8] pt-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-2xl font-semibold text-[#183c35]">Punya rencana untuk ruangmu?</h2>
              <p className="mt-2 text-sm text-stone-700">Mulai susun furnitur dan lihat rancanganmu dalam 3D.</p>
            </div>
            <Link
              href="/planner"
              className="inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-lg bg-[#1e493d] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#17392f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e493d] sm:self-auto"
            >
              Buka room planner <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-stone-200 bg-white px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
          <Link href="/" className="font-display text-lg font-semibold tracking-wide text-[#183c35]">ILENA INTERIOR</Link>
          <nav aria-label="Tautan footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-stone-700">
            <Link href="/catalog" className="hover:text-[#183c35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e493d]">Katalog</Link>
            <Link href="/portofolio" className="hover:text-[#183c35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e493d]" aria-current="page">Portofolio</Link>
          </nav>
          <p className="text-xs text-stone-600">© 2026 ILENA INTERIOR</p>
        </div>
      </footer>
    </div>
  );
}
