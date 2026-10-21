'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { LayoutDashboard, Package, LogOut, Image as ImageIcon, Settings, ShoppingCart, Users, ShieldCheck, BarChart3 } from 'lucide-react';
import { canAccessAdmin, canAccessAdminPath, adminLanding } from '@/lib/adminAccess';
import { cn } from '@/lib/utils';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import NotificationBell from '@/components/admin/NotificationBell';
import { Toaster } from 'react-hot-toast';

const NAV = [
  { href: '/admin',            label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/admin/ads', label: 'Analisa Iklan', icon: BarChart3 },
  { href: '/admin/analytics',  label: 'Analytics',   icon: BarChart3 },
  { href: '/admin/orders',     label: 'Pesanan',     icon: ShoppingCart },
  { href: '/admin/users',      label: 'User',        icon: Users },
  { href: '/admin/products',   label: 'Produk',      icon: Package },
  { href: '/admin/wallpapers', label: 'Wallpaper',   icon: ImageIcon },
  { href: '/admin/audit-logs', label: 'Audit Log',   icon: ShieldCheck },
  { href: '/admin/settings',   label: 'Pengaturan',  icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, fetchMe, logout } = useAuthStore();
  const router   = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      await fetchMe();
      setChecking(false);
    };
    check();
  }, [fetchMe]);

  useEffect(() => {
    if (!checking && (!user || !canAccessAdmin(user.role))) {
      router.replace('/login');
    } else if (!checking && !canAccessAdminPath(user?.role, pathname)) {
      router.replace(adminLanding(user?.role));
    }
  }, [checking, user, router, pathname]);

  if (checking || !canAccessAdmin(user?.role) || !canAccessAdminPath(user?.role, pathname)) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <WebSocketProvider>
      <div className="min-h-screen flex bg-stone-50">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 bg-stone-900 flex flex-col">
          <div className="p-5 border-b border-stone-800">
            <Link href="/" className="font-display text-white font-semibold tracking-wide text-base">
              ILENA INTERIOR
            </Link>
            <p className="text-stone-500 text-xs mt-0.5">{user?.role === 'ads_analyst' ? 'Analis Iklan · Read-only' : 'Admin Panel'}</p>
          </div>

          <nav className="flex-1 p-3 space-y-1">
            {NAV.filter(item => canAccessAdminPath(user?.role, item.href)).map(({ href, label, icon: Icon }) => {
              const active = href === '/admin' ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all',
                    active
                      ? 'bg-stone-700 text-white font-medium'
                      : 'text-stone-400 hover:bg-stone-800 hover:text-stone-200'
                  )}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="p-3 border-t border-stone-800">
            <div className="flex items-center gap-2 px-3 py-2 mb-1">
              <div className="w-7 h-7 rounded-full bg-stone-700 flex items-center justify-center text-xs font-bold text-stone-300">
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-stone-300 truncate">{user?.name}</p>
                <p className="text-[10px] text-stone-500 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={() => { logout(); router.push('/login'); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-stone-400 hover:text-red-400 hover:bg-stone-800 rounded-lg transition-all"
            >
              <LogOut size={14} /> Keluar
            </button>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Top Bar with Notification Bell */}
          <div className="bg-stone-900 border-b border-stone-800 px-6 py-3 flex items-center justify-end">
            {user?.role === 'admin' && <NotificationBell />}
          </div>

          {/* Main Content */}
          <main className="flex-1 min-h-0 overflow-auto">
            {children}
          </main>
        </div>

        {/* Toast Container */}
        <Toaster position="top-right" />
      </div>
    </WebSocketProvider>
  );
}
