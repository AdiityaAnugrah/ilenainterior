'use client';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const LoginForm = dynamic(() => import('./LoginForm'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col gap-4">
      <div className="h-20 bg-stone-100 rounded-lg animate-pulse" />
      <div className="h-20 bg-stone-100 rounded-lg animate-pulse" />
      <div className="h-12 bg-stone-100 rounded-lg animate-pulse" />
    </div>
  ),
});

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="font-display text-2xl font-bold text-stone-900 tracking-wide">
            ILENA INTERIOR
          </Link>
          <p className="text-stone-500 text-sm mt-2">Masuk ke akun kamu</p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-8">
          <LoginForm />

          <p className="text-center text-sm text-stone-500 mt-6">
            Belum punya akun?{' '}
            <Link href="/register" className="text-stone-800 font-medium hover:underline">
              Daftar sekarang
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-stone-400 mt-4">
          Atau{' '}
          <Link href="/planner" className="underline hover:text-stone-600">
            lanjut tanpa login
          </Link>
        </p>
      </div>
    </div>
  );
}
