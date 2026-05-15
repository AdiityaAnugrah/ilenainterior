'use client';
import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Settings, FolderOpen } from 'lucide-react';

export default function Navbar() {
  const { user, fetchMe, logout } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    fetchMe();
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-stone-100">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-display text-xl font-semibold text-stone-900 tracking-wide">
          ILENA INTERIOR
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/catalog" className="text-sm text-stone-600 hover:text-stone-900 transition-colors">
            Katalog
          </Link>

          {user ? (
            <>
              <Link
                href="/projects"
                className="flex items-center gap-1.5 text-sm text-stone-600 hover:text-stone-900 transition-colors"
              >
                <FolderOpen size={14} />
                Proyek Saya
              </Link>
              {user.role === 'admin' && (
                <Link
                  href="/admin"
                  className="flex items-center gap-1.5 text-sm text-stone-600 hover:text-stone-900 transition-colors"
                >
                  <Settings size={14} />
                  Admin
                </Link>
              )}
              <span className="text-sm text-stone-500">{user.name}</span>
              <button
                onClick={() => { logout(); router.push('/login'); }}
                className="text-sm text-stone-500 hover:text-stone-800 transition-colors"
              >
                Keluar
              </button>
            </>
          ) : (
            <Link href="/login" className="text-sm text-stone-600 hover:text-stone-900 transition-colors">
              Masuk
            </Link>
          )}

          <Link
            href="/planner"
            className="bg-stone-800 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-stone-700 transition-colors"
          >
            Mulai Desain
          </Link>
        </div>
      </div>
    </nav>
  );
}
