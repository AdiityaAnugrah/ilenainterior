'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { Package, Image as ImageIcon, TrendingUp, Plus, ArrowRight, ShoppingCart, ShieldCheck, Clock, AlertCircle, CheckCircle2, BarChart3 } from 'lucide-react';

interface Stats {
  totalProducts: number;
  totalOrders: number;
  totalUsers: number;
  totalRevenue: number;
  totalWallpapers: number;
}

interface AuditLog {
  id: number;
  admin_name: string | null;
  admin_email: string | null;
  method: string;
  path: string;
  status_code: number | null;
  created_at: string;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getActionLabel(path: string) {
  if (path.includes('/settings')) return 'Pengaturan sistem';
  if (path.includes('/orders')) return 'Pesanan';
  if (path.includes('/products')) return 'Produk';
  if (path.includes('/wallpapers')) return 'Wallpaper';
  if (path.includes('/users')) return 'User';
  return 'Admin';
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    api.get('/api/admin/stats').then(r => setStats(r.data)).catch(() => {});
    api.get('/api/admin/audit-logs?limit=5').then(r => setRecentLogs(r.data || [])).catch(() => {});
  }, []);

  const cards = [
    { label: 'Total Produk',    value: stats?.totalProducts   ?? '—', icon: Package,      color: 'bg-blue-50 text-blue-600' },
    { label: 'Total Pesanan',   value: stats?.totalOrders     ?? '—', icon: ShoppingCart, color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Total Wallpaper', value: stats?.totalWallpapers ?? '—', icon: ImageIcon,    color: 'bg-green-50 text-green-600' },
    { label: 'Total Revenue',   value: stats ? formatPrice(stats.totalRevenue) : '—', icon: TrendingUp, color: 'bg-amber-50 text-amber-600' },
  ];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Dashboard</h1>
          <p className="text-stone-500 text-sm mt-1">Selamat datang di panel admin ILENA INTERIOR</p>
        </div>
        <Link
          href="/admin/products/new"
          className="flex items-center gap-2 bg-stone-800 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-700 transition-colors"
        >
          <Plus size={16} /> Tambah Produk
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-stone-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-stone-500">{card.label}</p>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.color}`}>
                <card.icon size={18} />
              </div>
            </div>
            <p className="text-2xl font-bold text-stone-900">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Quick links */}
        <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/admin/orders" className="bg-white rounded-2xl border border-stone-100 p-5 hover:border-stone-200 hover:shadow-sm transition-all flex items-center justify-between group">
            <div>
              <p className="font-semibold text-stone-800">Kelola Pesanan</p>
              <p className="text-sm text-stone-500 mt-1">Lihat, kelola, dan update status pesanan customer</p>
            </div>
            <ArrowRight size={18} className="text-stone-300 group-hover:text-stone-600 transition-colors" />
          </Link>
          <Link href="/admin/products" className="bg-white rounded-2xl border border-stone-100 p-5 hover:border-stone-200 hover:shadow-sm transition-all flex items-center justify-between group">
            <div>
              <p className="font-semibold text-stone-800">Kelola Produk</p>
              <p className="text-sm text-stone-500 mt-1">Tambah, edit, dan hapus produk beserta model 3D</p>
            </div>
            <ArrowRight size={18} className="text-stone-300 group-hover:text-stone-600 transition-colors" />
          </Link>
          <Link href="/admin/wallpapers" className="bg-white rounded-2xl border border-stone-100 p-5 hover:border-stone-200 hover:shadow-sm transition-all flex items-center justify-between group">
            <div>
              <p className="font-semibold text-stone-800">Kelola Wallpaper</p>
              <p className="text-sm text-stone-500 mt-1">Tambah, edit wallpaper dengan harga per meter</p>
            </div>
            <ArrowRight size={18} className="text-stone-300 group-hover:text-stone-600 transition-colors" />
          </Link>
          <Link href="/admin/settings" className="bg-white rounded-2xl border border-stone-100 p-5 hover:border-stone-200 hover:shadow-sm transition-all flex items-center justify-between group">
            <div>
              <p className="font-semibold text-stone-800">Pengaturan</p>
              <p className="text-sm text-stone-500 mt-1">Atur nomor WhatsApp dan konfigurasi lainnya</p>
            </div>
            <ArrowRight size={18} className="text-stone-300 group-hover:text-stone-600 transition-colors" />
          </Link>
          <Link href="/admin/audit-logs" className="md:col-span-2 bg-white rounded-2xl border border-stone-100 p-5 hover:border-stone-200 hover:shadow-sm transition-all flex items-center justify-between group">
            <div>
              <p className="font-semibold text-stone-800 flex items-center gap-2">
                <ShieldCheck size={17} /> Audit Log
              </p>
              <p className="text-sm text-stone-500 mt-1">Lihat riwayat aktivitas admin dan perubahan penting</p>
            </div>
            <ArrowRight size={18} className="text-stone-300 group-hover:text-stone-600 transition-colors" />
          </Link>
          <Link href="/admin/analytics" className="md:col-span-2 bg-stone-900 rounded-2xl border border-stone-800 p-5 hover:bg-stone-800 transition-all flex items-center justify-between group">
            <div>
              <p className="font-semibold text-white flex items-center gap-2">
                <BarChart3 size={17} /> Analytics Penjualan
              </p>
              <p className="text-sm text-stone-400 mt-1">Pantau revenue, status order, produk terlaris, dan pesanan terbaru</p>
            </div>
            <ArrowRight size={18} className="text-stone-500 group-hover:text-white transition-colors" />
          </Link>
        </div>

        {/* Recent activity */}
        <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
          <div className="p-5 border-b border-stone-100 flex items-center justify-between">
            <div>
              <p className="font-semibold text-stone-900">Aktivitas Terbaru</p>
              <p className="text-xs text-stone-500 mt-1">5 perubahan admin terakhir</p>
            </div>
            <ShieldCheck size={18} className="text-stone-400" />
          </div>

          {recentLogs.length === 0 ? (
            <div className="p-5 text-sm text-stone-500">Belum ada aktivitas admin.</div>
          ) : (
            <div className="divide-y divide-stone-100">
              {recentLogs.map((log) => {
                const isError = Number(log.status_code || 0) >= 400;
                return (
                  <div key={log.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center ${isError ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {isError ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-stone-700">{log.method}</span>
                          <p className="text-sm font-medium text-stone-900 truncate">{getActionLabel(log.path)}</p>
                        </div>
                        <p className="text-xs text-stone-500 truncate">{log.admin_name || log.admin_email || 'Admin'}</p>
                        <p className="text-xs text-stone-400 mt-1 flex items-center gap-1">
                          <Clock size={12} />
                          {formatDate(log.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Link href="/admin/audit-logs" className="flex items-center justify-center gap-2 p-4 border-t border-stone-100 text-sm font-medium text-stone-700 hover:bg-stone-50">
            Lihat semua audit log
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}
