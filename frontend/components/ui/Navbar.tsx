'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Settings, FolderOpen, Menu, X } from 'lucide-react';

export default function Navbar() {
  const { user, fetchMe, logout } = useAuthStore();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchMe();
  }, []);

  const closeMenu = () => setOpen(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-stone-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" onClick={closeMenu} className="font-display text-lg sm:text-xl font-semibold text-stone-900 tracking-wide">
          ILENA INTERIOR
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-4">
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

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Tutup menu' : 'Buka menu'}
          aria-expanded={open}
          className="md:hidden p-2 -mr-2 rounded-lg text-stone-700 hover:bg-stone-100 transition-colors"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu panel */}
      {open && (
        <div className="md:hidden border-t border-stone-100 bg-white/95 backdrop-blur-md">
          <div className="px-4 py-3 flex flex-col gap-1">
            <Link href="/catalog" onClick={closeMenu} className="px-2 py-2.5 rounded-lg text-sm text-stone-700 hover:bg-stone-100 transition-colors">
              Katalog
            </Link>

            {user ? (
              <>
                <Link href="/projects" onClick={closeMenu} className="flex items-center gap-2 px-2 py-2.5 rounded-lg text-sm text-stone-700 hover:bg-stone-100 transition-colors">
                  <FolderOpen size={16} /> Proyek Saya
                </Link>
                {user.role === 'admin' && (
                  <Link href="/admin" onClick={closeMenu} className="flex items-center gap-2 px-2 py-2.5 rounded-lg text-sm text-stone-700 hover:bg-stone-100 transition-colors">
                    <Settings size={16} /> Admin
                  </Link>
                )}
                <div className="px-2 py-2 text-xs text-stone-400">Masuk sebagai {user.name}</div>
                <button
                  onClick={() => { closeMenu(); logout(); router.push('/login'); }}
                  className="text-left px-2 py-2.5 rounded-lg text-sm text-stone-600 hover:bg-stone-100 transition-colors"
                >
                  Keluar
                </button>
              </>
            ) : (
              <Link href="/login" onClick={closeMenu} className="px-2 py-2.5 rounded-lg text-sm text-stone-700 hover:bg-stone-100 transition-colors">
                Masuk
              </Link>
            )}

            <Link
              href="/planner"
              onClick={closeMenu}
              className="mt-1 text-center bg-stone-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:bg-stone-700 transition-colors"
            >
              Mulai Desain
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
