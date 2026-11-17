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
        className="block h-auto w-full drop-shadow-[0_28px_30px_rgba(41,37,36,0.12)]"
      >
        <title id="room-title">Ilustrasi ruang keluarga hasil tata ruang</title>
        <desc id="room-description">Ruang keluarga bernuansa netral dan hangat dengan sofa, meja kayu, jendela, dan tanaman.</desc>
        <defs>
          <linearGradient id="wall-left" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fafaf9" />
            <stop offset="1" stopColor="#e7e5e4" />
          </linearGradient>
          <linearGradient id="wall-right" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f8ede0" />
            <stop offset="1" stopColor="#e7e5e4" />
          </linearGradient>
          <linearGradient id="floor" x1="0" y1="0" x2="0.8" y2="1">
            <stop offset="0" stopColor="#f8ede0" />
            <stop offset="1" stopColor="#d4956b" />
          </linearGradient>
          <pattern id="floor-lines" width="52" height="52" patternTransform="skewY(-20)" patternUnits="userSpaceOnUse">
            <path d="M0 0H52M0 0V52" fill="none" stroke="#c17b4e" strokeOpacity=".22" strokeWidth="1.5" />
          </pattern>
          <filter id="soft-shadow" x="-30%" y="-30%" width="160%" height="180%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
        </defs>

        <path d="M54 91 344 0l290 91-290 102Z" fill="#f5f5f4" />
        <path d="M54 91 344 193v225L54 315Z" fill="url(#wall-left)" />
        <path d="M344 193 634 91v224L344 418Z" fill="url(#wall-right)" />
        <path d="m54 315 290 103 290-103v151L344 560 54 466Z" fill="url(#floor)" />
        <path d="m54 315 290 103 290-103v151L344 560 54 466Z" fill="url(#floor-lines)" />

        {/* Morning light through a framed window */}
        <path d="m92 119 178 62v127L92 246Z" fill="#e7e5e4" stroke="#fafaf9" strokeWidth="12" />
        <path d="m181 150 2 126M99 183l165 58" stroke="#fafaf9" strokeWidth="8" />
        <path d="m78 251 202 70-13 11-198-70Z" fill="#d4956b" />
        <path d="m238 93 67-23v114l-67 23Z" fill="#f5f5f4" stroke="#e7e5e4" strokeWidth="4" />
        <path d="m250 101 44-15v88l-44 15Z" fill="#d6d3d1" />

        {/* Wall art */}
        <path d="m422 87 132-46v95l-132 46Z" fill="#f5f5f4" stroke="#c17b4e" strokeWidth="7" />
        <path d="m438 94 100-35v64l-100 35Z" fill="#a8a29e" />
        <path d="m438 144 39-48 22 25 24-44 15 4v42l-100 35Z" fill="#d4956b" />

        {/* Rug and its woven border */}
        <path d="m170 375 185-66 190 67-188 75Z" fill="#f8ede0" opacity=".96" />
        <path d="m190 375 165-59 168 60-166 66Z" fill="none" stroke="#d4956b" strokeWidth="2" strokeDasharray="3 8" />

        {/* Sofa silhouette with separate cushions */}
        <ellipse cx="365" cy="399" rx="167" ry="38" fill="#57534e" opacity=".22" filter="url(#soft-shadow)" />
        <path d="m242 260 115 41 115-40v87l-115 47-115-42Z" fill="#78716c" />
        <path d="m214 311 143 52v78l-143-52Z" fill="#57534e" />
        <path d="m357 363 143-52v78l-143 52Z" fill="#44403c" />
        <path d="m200 333 157 57v55l-157-56Z" fill="#78716c" />
        <path d="m357 390 157-57v55l-157 57Z" fill="#57534e" />
        <path d="m224 324 125 45v47l-125-45Z" fill="#a8a29e" />
        <path d="m365 369 126-45v47l-126 45Z" fill="#78716c" />
        <path d="m208 418 10 4v19l-10-4Zm285-1 10-4v19l-10 4Z" fill="#a86339" />

        {/* Low timber coffee table */}
        <path d="m276 437 86-31 94 34-87 34Z" fill="#c17b4e" />
        <path d="m285 444 84 30v41l-84-30Zm156 0-72 27v44l72-27Z" fill="#a86339" />
        <path d="m294 437 68-24 73 27-68 25Z" fill="#d4956b" />
        <ellipse cx="363" cy="429" rx="23" ry="8" fill="#e7e5e4" transform="rotate(20 363 429)" />

        {/* A potted tree adds a vertical counterpoint */}
        <path d="m553 357 35 12-1 50-35-12Z" fill="#a86339" />
        <path d="m567 367 2-113" stroke="#57534e" strokeWidth="8" strokeLinecap="round" />
        <path d="M568 291c-47-7-52-43-24-51 17 3 25 19 24 51Zm2-23c17-48 50-45 55-25-7 18-27 23-55 25Zm-2-9c-28-32-14-58 5-56 13 14 10 33-5 56Zm2 37c28-36 56-25 53-6-12 16-31 15-53 6Z" fill="#a8a29e" />
        <path d="m575 375 2-86" stroke="#78716c" strokeWidth="3" strokeLinecap="round" />
        <path d="m537 427 31-11 34 12-31 12Z" fill="#e7e5e4" />

        {/* Compact reading lamp */}
        <path d="m119 384 4-84" stroke="#57534e" strokeWidth="5" />
        <path d="m101 302 44-15-2 28-43 15Z" fill="#d4956b" />
        <path d="m105 390 35-12 17 7-35 13Z" fill="#78716c" />
      </svg>

      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-xl border border-white/70 bg-white/95 px-4 py-3 shadow-lg shadow-stone-900/10 sm:bottom-5 sm:left-5 sm:right-5">
        <div>
          <p className="text-sm font-semibold text-stone-900">Contoh ruang keluarga</p>
          <p className="mt-0.5 text-xs text-stone-600">Susun, sesuaikan, lalu lihat dalam 3D</p>
        </div>
        <span className="rounded-md bg-warm-50 px-2.5 py-1.5 text-xs font-semibold text-stone-800">4 × 5 m</span>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-stone-50">
      <Navbar />

      <main>
        <section className="px-5 pb-14 pt-24 sm:px-8 sm:pb-16 sm:pt-28 lg:pb-20 lg:pt-32">
          <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:gap-6">
            <div className="relative z-10 max-w-xl">
              <p className="mb-5 flex items-center gap-2 text-sm font-semibold text-stone-700">
                <span className="h-px w-8 bg-warm-500" />
                Ruangmu, dengan caramu
              </p>
              <h1 className="font-display text-[2.7rem] font-semibold leading-[1.08] tracking-[-0.035em] text-stone-900 sm:text-6xl lg:text-[4.25rem]">
                Lihat furnitur di ruangmu, sebelum memilih.
              </h1>
              <p className="mt-6 max-w-lg text-base leading-7 text-stone-700 sm:text-lg sm:leading-8">
                Atur ukuran ruang, coba produk ILENA, dan lihat hasilnya dalam 3D. Mulai dari denah kosong, lalu bentuk ruang yang terasa pas.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/planner"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-stone-800 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-stone-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-800"
                >
                  Mulai desain gratis
                  <ArrowUpRight size={17} aria-hidden="true" />
                </Link>
                <Link
                  href="/catalog"
                  className="inline-flex min-h-12 items-center justify-center rounded-lg border border-stone-300 bg-transparent px-6 py-3 text-sm font-semibold text-stone-800 transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-800"
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
              <p className="mb-3 text-sm font-semibold text-stone-700">Mulai dari denah, bukan tebakan</p>
              <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight text-stone-900 sm:text-4xl">
                Dari ukuran ruang ke gambaran yang lebih jelas.
              </h2>
            </div>
            <ol className="grid gap-8 border-t border-stone-300 pt-6 md:grid-cols-3 md:gap-10">
              {steps.map((step) => (
                <li key={step.number} className="grid grid-cols-[3rem_1fr] gap-4">
                  <span className="font-display text-xl font-semibold text-stone-700">{step.number}</span>
                  <div>
                    <h3 className="text-base font-semibold text-stone-900">{step.title}</h3>
                    <p className="mt-1 max-w-xs text-sm leading-6 text-stone-700">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="bg-stone-900 px-5 py-16 text-white sm:px-8 sm:py-20">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <div>
              <p className="mb-3 text-sm font-semibold text-warm-400">Rancang dengan lebih yakin</p>
              <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                Setiap pilihan punya tempatnya.
              </h2>
              <p className="mt-5 max-w-md text-base leading-7 text-stone-300">
                Ukurannya terlihat, susunannya bisa dicoba, dan perubahan terasa sebelum kamu memutuskan.
              </p>
              <Link
                href="/planner"
                className="mt-7 inline-flex min-h-12 items-center justify-center rounded-lg bg-warm-400 px-6 py-3 text-sm font-semibold text-stone-900 transition-colors hover:bg-warm-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Coba room planner
              </Link>
            </div>

            <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {capabilities.map(({ icon: Icon, title, description }) => (
                <article key={title} className="border-t border-white/25 pt-5">
                  <Icon size={21} strokeWidth={1.8} className="text-warm-400" aria-hidden="true" />
                  <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-stone-300">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto flex max-w-7xl flex-col gap-7 rounded-2xl bg-warm-50 px-6 py-9 sm:px-10 md:flex-row md:items-center md:justify-between md:py-11">
            <div className="max-w-2xl">
              <h2 className="font-display text-2xl font-semibold leading-tight text-stone-900 sm:text-3xl">Mulai dengan satu ruangan.</h2>
              <p className="mt-2 text-sm leading-6 text-stone-700 sm:text-base">Coba beberapa susunan sampai kamu menemukan yang paling nyaman.</p>
            </div>
            <Link
              href="/planner"
              className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-lg bg-stone-800 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-stone-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-800"
            >
              Buka room planner
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-stone-200 bg-stone-50 px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
          <Link href="/" className="font-display text-lg font-semibold tracking-wide text-stone-900">ILENA INTERIOR</Link>
          <nav aria-label="Tautan footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-stone-700">
            <Link href="/catalog" className="hover:text-stone-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-800">Katalog</Link>
            <Link href="/portofolio" className="hover:text-stone-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-800">Portofolio</Link>
            <Link href="/login" className="hover:text-stone-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-800">Masuk</Link>
            <Link href="/register" className="hover:text-stone-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-800">Daftar</Link>
          </nav>
          <p className="text-xs text-stone-600">© 2026 ILENA INTERIOR</p>
        </div>
      </footer>
    </div>
  );
}
