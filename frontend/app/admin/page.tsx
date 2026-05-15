'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { Package, Image as ImageIcon, Users, TrendingUp, Plus, ArrowRight, ShoppingCart } from 'lucide-react';

interface Stats {
  totalProducts: number;
  totalOrders: number;
  totalUsers: number;
  totalRevenue: number;
  totalWallpapers: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.get('/admin/stats').then(r => setStats(r.data)).catch(() => {});
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

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      </div>
    </div>
  );
}
