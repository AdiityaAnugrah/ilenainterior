import Link from 'next/link';
import { ArrowUpRight, Eye, Layers, MessageCircle, Sofa } from 'lucide-react';
import Navbar from '@/components/ui/Navbar';
import ResumeDesignBanner from '@/components/ui/ResumeDesignBanner';

const steps = [
  { number: '01', title: 'Ukur ruang', description: 'Masukkan panjang dan lebar ruanganmu.' },
  { number: '02', title: 'Atur furnitur', description: 'Pilih produk, lalu susun sesuai kebutuhan.' },
  { number: '03', title: 'Lihat hasilnya', description: 'Jelajahi rancangan dalam tampilan 2D dan 3D.' },
];

const capabilities = [
  { icon: Layers, title: 'Ukuran ruang yang nyata', description: 'Mulai dari dimensi ruangan, bukan perkiraan di atas kertas.' },
  { icon: Sofa, title: 'Produk ILENA di denahmu', description: 'Coba tata letak furnitur sebelum menentukan pilihan.' },
  { icon: Eye, title: 'Lihat dari berbagai sudut', description: 'Beralih antara denah 2D, tampilan 3D, dan walk-through.' },
  { icon: MessageCircle, title: 'Lanjutkan dengan konsultasi', description: 'Bawa rancanganmu ke percakapan WhatsApp dengan tim kami.' },
];

function RoomIllustration() {
  return (
    <div className="relative mx-auto w-full max-w-[650px]">
      <svg
        viewBox="0 0 688 560"
        role="img"
        aria-labelledby="room-title room-description"
        className="block h-auto w-full drop-shadow-[0_28px_30px_rgba(29,58,50,0.12)]"
      >
        <title id="room-title">Ilustrasi ruang keluarga hasil tata ruang</title>
        <desc id="room-description">Ruang keluarga bernuansa hijau dengan sofa, meja kayu, jendela, dan tanaman.</desc>
        <defs>
          <linearGradient id="wall-left" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f7f5ed" />
            <stop offset="1" stopColor="#e6e6d8" />
          </linearGradient>
          <linearGradient id="wall-right" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#e2e8dc" />
            <stop offset="1" stopColor="#cbd7c8" />
          </linearGradient>
          <linearGradient id="floor" x1="0" y1="0" x2="0.8" y2="1">
            <stop offset="0" stopColor="#dfc293" />
            <stop offset="1" stopColor="#c69e6c" />
          </linearGradient>
          <pattern id="floor-lines" width="52" height="52" patternTransform="skewY(-20)" patternUnits="userSpaceOnUse">
            <path d="M0 0H52M0 0V52" fill="none" stroke="#ab8256" strokeOpacity=".22" strokeWidth="1.5" />
          </pattern>
          <filter id="soft-shadow" x="-30%" y="-30%" width="160%" height="180%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
        </defs>

        <path d="M54 91 344 0l290 91-290 102Z" fill="#f1f1e8" />
        <path d="M54 91 344 193v225L54 315Z" fill="url(#wall-left)" />
        <path d="M344 193 634 91v224L344 418Z" fill="url(#wall-right)" />
        <path d="m54 315 290 103 290-103v151L344 560 54 466Z" fill="url(#floor)" />
        <path d="m54 315 290 103 290-103v151L344 560 54 466Z" fill="url(#floor-lines)" />

        {/* Morning light through a framed window */}
        <path d="m92 119 178 62v127L92 246Z" fill="#c5d8d4" stroke="#fffdf7" strokeWidth="12" />
        <path d="m181 150 2 126M99 183l165 58" stroke="#fffdf7" strokeWidth="8" />
        <path d="m78 251 202 70-13 11-198-70Z" fill="#d0b183" />
        <path d="m238 93 67-23v114l-67 23Z" fill="#f8f6ee" stroke="#d8d5c8" strokeWidth="4" />
        <path d="m250 101 44-15v88l-44 15Z" fill="#a7c1bb" />

        {/* Wall art */}
        <path d="m422 87 132-46v95l-132 46Z" fill="#fbf8ee" stroke="#b49a72" strokeWidth="7" />
        <path d="m438 94 100-35v64l-100 35Z" fill="#80988a" />
        <path d="m438 144 39-48 22 25 24-44 15 4v42l-100 35Z" fill="#d8c091" />

        {/* Rug and its woven border */}
        <path d="m170 375 185-66 190 67-188 75Z" fill="#eee8d7" opacity=".96" />
        <path d="m190 375 165-59 168 60-166 66Z" fill="none" stroke="#c5ad82" strokeWidth="2" strokeDasharray="3 8" />

        {/* Sofa silhouette with separate cushions */}
        <ellipse cx="365" cy="399" rx="167" ry="38" fill="#4a584c" opacity=".22" filter="url(#soft-shadow)" />
        <path d="m242 260 115 41 115-40v87l-115 47-115-42Z" fill="#587b69" />
        <path d="m214 311 143 52v78l-143-52Z" fill="#365c4c" />
        <path d="m357 363 143-52v78l-143 52Z" fill="#426b58" />
        <path d="m200 333 157 57v55l-157-56Z" fill="#587b69" />
        <path d="m357 390 157-57v55l-157 57Z" fill="#4a735f" />
        <path d="m224 324 125 45v47l-125-45Z" fill="#789783" />
        <path d="m365 369 126-45v47l-126 45Z" fill="#6d8d78" />
        <path d="m208 418 10 4v19l-10-4Zm285-1 10-4v19l-10 4Z" fill="#785c3f" />

        {/* Low timber coffee table */}
        <path d="m276 437 86-31 94 34-87 34Z" fill="#b9814f" />
        <path d="m285 444 84 30v41l-84-30Zm156 0-72 27v44l72-27Z" fill="#8f613d" />
        <path d="m294 437 68-24 73 27-68 25Z" fill="#d2a36d" />
        <ellipse cx="363" cy="429" rx="23" ry="8" fill="#dce4d8" transform="rotate(20 363 429)" />

        {/* A potted tree adds a vertical counterpoint */}
        <path d="m553 357 35 12-1 50-35-12Z" fill="#9e6f48" />
        <path d="m567 367 2-113" stroke="#6d5438" strokeWidth="8" strokeLinecap="round" />
        <path d="M568 291c-47-7-52-43-24-51 17 3 25 19 24 51Zm2-23c17-48 50-45 55-25-7 18-27 23-55 25Zm-2-9c-28-32-14-58 5-56 13 14 10 33-5 56Zm2 37c28-36 56-25 53-6-12 16-31 15-53 6Z" fill="#78906f" />
        <path d="m575 375 2-86" stroke="#839b79" strokeWidth="3" strokeLinecap="round" />
        <path d="m537 427 31-11 34 12-31 12Z" fill="#d9d1bc" />

        {/* Compact reading lamp */}
        <path d="m119 384 4-84" stroke="#5e6659" strokeWidth="5" />
        <path d="m101 302 44-15-2 28-43 15Z" fill="#e9c575" />
        <path d="m105 390 35-12 17 7-35 13Z" fill="#667267" />
      </svg>

      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-xl border border-white/70 bg-white/95 px-4 py-3 shadow-lg shadow-stone-900/10 sm:bottom-5 sm:left-5 sm:right-5">
        <div>
          <p className="text-sm font-semibold text-stone-900">Contoh ruang keluarga</p>
          <p className="mt-0.5 text-xs text-stone-600">Susun, sesuaikan, lalu lihat dalam 3D</p>
        </div>
        <span className="rounded-md bg-[#e8efe5] px-2.5 py-1.5 text-xs font-semibold text-[#23483d]">4 × 5 m</span>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#f6f7f2]">
      <Navbar />

      <main>
        <section className="px-5 pb-14 pt-24 sm:px-8 sm:pb-16 sm:pt-28 lg:pb-20 lg:pt-32">
          <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:gap-6">
            <div className="relative z-10 max-w-xl">
              <p className="mb-5 flex items-center gap-2 text-sm font-semibold text-[#315d4c]">
                <span className="h-px w-8 bg-[#315d4c]" />
                Ruangmu, dengan caramu
              </p>
              <h1 className="font-display text-[2.7rem] font-semibold leading-[1.08] tracking-[-0.035em] text-[#183c35] sm:text-6xl lg:text-[4.25rem]">
                Lihat furnitur di ruangmu, sebelum memilih.
              </h1>
              <p className="mt-6 max-w-lg text-base leading-7 text-stone-700 sm:text-lg sm:leading-8">
                Atur ukuran ruang, coba produk ILENA, dan lihat hasilnya dalam 3D. Mulai dari denah kosong, lalu bentuk ruang yang terasa pas.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/planner"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#1e493d] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#17392f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e493d]"
                >
                  Mulai desain gratis
                  <ArrowUpRight size={17} aria-hidden="true" />
                </Link>
                <Link
                  href="/catalog"
                  className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[#9aa99c] bg-transparent px-6 py-3 text-sm font-semibold text-[#23483d] transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e493d]"
                >
                  Jelajahi furnitur
                </Link>
              </div>
              <p className="mt-4 text-sm text-stone-700">Gratis untuk dicoba. Tidak perlu akun.</p>
            </div>

            <div className="lg:-mr-8 xl:-mr-16">
              <RoomIllustration />
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <ResumeDesignBanner />
        </div>

        <section className="px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 max-w-2xl sm:mb-14">
              <p className="mb-3 text-sm font-semibold text-[#315d4c]">Mulai dari denah, bukan tebakan</p>
              <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight text-[#183c35] sm:text-4xl">
                Dari ukuran ruang ke gambaran yang lebih jelas.
              </h2>
            </div>
            <ol className="grid gap-8 border-t border-[#cbd2c8] pt-6 md:grid-cols-3 md:gap-10">
              {steps.map((step) => (
                <li key={step.number} className="grid grid-cols-[3rem_1fr] gap-4">
                  <span className="font-display text-xl font-semibold text-[#315d4c]">{step.number}</span>
                  <div>
                    <h3 className="text-base font-semibold text-stone-900">{step.title}</h3>
                    <p className="mt-1 max-w-xs text-sm leading-6 text-stone-700">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="bg-[#183c35] px-5 py-16 text-white sm:px-8 sm:py-20">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <div>
              <p className="mb-3 text-sm font-semibold text-[#d6c49e]">Rancang dengan lebih yakin</p>
              <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                Setiap pilihan punya tempatnya.
              </h2>
              <p className="mt-5 max-w-md text-base leading-7 text-[#e1e9df]">
                Ukurannya terlihat, susunannya bisa dicoba, dan perubahan terasa sebelum kamu memutuskan.
              </p>
              <Link
                href="/planner"
                className="mt-7 inline-flex min-h-12 items-center justify-center rounded-lg bg-[#e8c77d] px-6 py-3 text-sm font-semibold text-[#17392f] transition-colors hover:bg-[#f0d99e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Coba room planner
              </Link>
            </div>

            <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {capabilities.map(({ icon: Icon, title, description }) => (
                <article key={title} className="border-t border-white/25 pt-5">
                  <Icon size={21} strokeWidth={1.8} className="text-[#e8c77d]" aria-hidden="true" />
                  <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#e1e9df]">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto flex max-w-7xl flex-col gap-7 rounded-2xl bg-[#e8ede4] px-6 py-9 sm:px-10 md:flex-row md:items-center md:justify-between md:py-11">
            <div className="max-w-2xl">
              <h2 className="font-display text-2xl font-semibold leading-tight text-[#183c35] sm:text-3xl">Mulai dengan satu ruangan.</h2>
              <p className="mt-2 text-sm leading-6 text-stone-700 sm:text-base">Coba beberapa susunan sampai kamu menemukan yang paling nyaman.</p>
            </div>
            <Link
              href="/planner"
              className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-lg bg-[#1e493d] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#17392f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e493d]"
            >
              Buka room planner
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-stone-200 bg-[#f6f7f2] px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
          <Link href="/" className="font-display text-lg font-semibold tracking-wide text-[#183c35]">ILENA INTERIOR</Link>
          <nav aria-label="Tautan footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-stone-700">
            <Link href="/catalog" className="hover:text-[#183c35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e493d]">Katalog</Link>
            <Link href="/portofolio" className="hover:text-[#183c35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e493d]">Portofolio</Link>
            <Link href="/login" className="hover:text-[#183c35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e493d]">Masuk</Link>
            <Link href="/register" className="hover:text-[#183c35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e493d]">Daftar</Link>
          </nav>
          <p className="text-xs text-stone-600">© 2026 ILENA INTERIOR</p>
        </div>
      </footer>
    </div>
  );
}
