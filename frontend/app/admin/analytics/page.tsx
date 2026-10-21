'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { formatPrice } from '@/lib/utils';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Clock,
  Package,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  Wallet,
} from 'lucide-react';

interface AnalyticsData {
  summary: {
    total_orders: number;
    total_revenue: number;
    average_order_value: number;
    pending_orders: number;
    paid_orders: number;
    processing_orders: number;
    shipped_orders: number;
    delivered_orders: number;
    cancelled_orders: number;
    orders_today: number;
    revenue_today: number;
    orders_30d: number;
    revenue_30d: number;
  };
  daily: Array<{ day: string; orders: number; revenue: number }>;
  status_breakdown: Array<{ status: string; count: number; revenue: number }>;
  top_products: Array<{ id: number; name: string; sku: string; quantity_sold: number; revenue: number }>;
  recent_orders: Array<{ id: number; order_code: string; status: string; total: number; created_at: string; customer_name: string | null }>;
}

const statusLabel: Record<string, string> = {
  pending: 'Pending',
  paid: 'Dibayar',
  processing: 'Diproses',
  shipped: 'Dikirim',
  delivered: 'Selesai',
  cancelled: 'Dibatalkan',
};

const statusColor: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-100',
  paid: 'bg-blue-50 text-blue-700 border-blue-100',
  processing: 'bg-purple-50 text-purple-700 border-purple-100',
  shipped: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  delivered: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  cancelled: 'bg-red-50 text-red-700 border-red-100',
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short' }).format(new Date(value));
}

export default function AdminAnalyticsPage() {
  const isAnalyst = useAuthStore(state => state.user?.role) === 'ads_analyst';
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [days, setDays] = useState(14);

  const fetchAnalytics = async (selectedDays = days) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/api/admin/analytics?days=${selectedDays}`);
      setData(res.data);
    } catch {
      setError('Gagal memuat analytics. Coba refresh kembali.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const maxRevenue = useMemo(() => Math.max(...(data?.daily || []).map(item => item.revenue), 1), [data]);
  const maxProductQty = useMemo(() => Math.max(...(data?.top_products || []).map(item => item.quantity_sold), 1), [data]);

  const cards = [
    {
      label: 'Revenue 30 Hari',
      value: data ? formatPrice(data.summary.revenue_30d) : '—',
      sub: `${data?.summary.orders_30d ?? 0} order`,
      icon: Wallet,
      tone: 'bg-emerald-50 text-emerald-700',
    },
    {
      label: 'Revenue Hari Ini',
      value: data ? formatPrice(data.summary.revenue_today) : '—',
      sub: `${data?.summary.orders_today ?? 0} order hari ini`,
      icon: TrendingUp,
      tone: 'bg-blue-50 text-blue-700',
    },
    {
      label: 'Total Pesanan',
      value: data?.summary.total_orders ?? '—',
      sub: `${data?.summary.pending_orders ?? 0} pending`,
      icon: ShoppingCart,
      tone: 'bg-amber-50 text-amber-700',
    },
    {
      label: 'Rata-rata Order',
      value: data ? formatPrice(data.summary.average_order_value) : '—',
      sub: 'Tidak termasuk cancelled',
      icon: BarChart3,
      tone: 'bg-purple-50 text-purple-700',
    },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-100 text-stone-600 text-xs font-medium mb-3">
            <BarChart3 size={14} />
            Sales Analytics
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Analytics Penjualan</h1>
          <p className="text-stone-500 text-sm mt-1">
            Pantau revenue, status order, produk terlaris, dan aktivitas pesanan terbaru.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-3 py-2.5 rounded-xl border border-stone-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10"
          >
            <option value={14}>14 hari</option>
            <option value={30}>30 hari</option>
            <option value={90}>90 hari</option>
          </select>
          <button
            onClick={() => fetchAnalytics(days)}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 disabled:opacity-60"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-stone-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-stone-500">{card.label}</p>
                <p className="text-xs text-stone-400 mt-1">{card.sub}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.tone}`}>
                <card.icon size={19} />
              </div>
            </div>
            <p className="text-2xl font-bold text-stone-900">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        <div className="xl:col-span-2 bg-white rounded-2xl border border-stone-100 p-5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="font-semibold text-stone-900">Revenue Harian</p>
              <p className="text-xs text-stone-500 mt-1">Perbandingan revenue {days} hari terakhir</p>
            </div>
            <TrendingUp size={18} className="text-stone-400" />
          </div>

          {loading ? (
            <div className="h-72 flex items-center justify-center text-stone-500 text-sm">
              <RefreshCw size={17} className="animate-spin mr-2" /> Memuat grafik...
            </div>
          ) : !data?.daily.length ? (
            <div className="h-72 flex items-center justify-center text-stone-500 text-sm">Belum ada data revenue.</div>
          ) : (
            <div className="h-72 flex items-end gap-2">
              {data.daily.map((item) => {
                const height = Math.max((item.revenue / maxRevenue) * 100, item.revenue > 0 ? 6 : 2);
                return (
                  <div key={item.day} className="flex-1 min-w-0 flex flex-col items-center gap-2 group">
                    <div className="relative w-full flex items-end h-56">
                      <div
                        className="w-full rounded-t-lg bg-stone-800 group-hover:bg-stone-700 transition-colors"
                        style={{ height: `${height}%` }}
                        title={`${formatDate(item.day)}: ${formatPrice(item.revenue)} (${item.orders} order)`}
                      />
                    </div>
                    <p className="text-[10px] text-stone-400 truncate w-full text-center">{formatDate(item.day)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-stone-100 p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="font-semibold text-stone-900">Status Order</p>
              <p className="text-xs text-stone-500 mt-1">Distribusi semua pesanan</p>
            </div>
            <ShoppingCart size={18} className="text-stone-400" />
          </div>

          <div className="space-y-3">
            {(data?.status_breakdown || []).map((item) => {
              const pct = data?.summary.total_orders ? (item.count / data.summary.total_orders) * 100 : 0;
              return (
                <div key={item.status}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`px-2 py-1 rounded-lg border text-xs font-medium ${statusColor[item.status] || 'bg-stone-50 text-stone-700 border-stone-100'}`}>
                      {statusLabel[item.status] || item.status}
                    </span>
                    <span className="text-xs font-semibold text-stone-700">{item.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                    <div className="h-full rounded-full bg-stone-800" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {!loading && !data?.status_breakdown.length && (
              <p className="text-sm text-stone-500">Belum ada status order.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
          <div className="p-5 border-b border-stone-100 flex items-center justify-between">
            <div>
              <p className="font-semibold text-stone-900">Produk Terlaris</p>
              <p className="text-xs text-stone-500 mt-1">Berdasarkan quantity terjual</p>
            </div>
            <Package size={18} className="text-stone-400" />
          </div>

          <div className="divide-y divide-stone-100">
            {(data?.top_products || []).map((product, idx) => {
              const pct = (product.quantity_sold / maxProductQty) * 100;
              return (
                <div key={product.id} className="p-4">
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-stone-900 truncate">
                        #{idx + 1} {product.name}
                      </p>
                      <p className="text-xs text-stone-500">{product.sku} · {product.quantity_sold} terjual</p>
                    </div>
                    <p className="text-sm font-bold text-stone-900 shrink-0">{formatPrice(product.revenue)}</p>
                  </div>
                  <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-600" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {!loading && !data?.top_products.length && (
              <div className="p-5 text-sm text-stone-500">Belum ada produk terjual.</div>
            )}
          </div>
        </div>

        {!isAnalyst && <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
          <div className="p-5 border-b border-stone-100 flex items-center justify-between">
            <div>
              <p className="font-semibold text-stone-900">Pesanan Terbaru</p>
              <p className="text-xs text-stone-500 mt-1">8 order terakhir</p>
            </div>
            <Clock size={18} className="text-stone-400" />
          </div>

          <div className="divide-y divide-stone-100">
            {(data?.recent_orders || []).map((order) => (
              <Link key={order.id} href={`/admin/orders/${order.id}`} className="p-4 flex items-center justify-between gap-4 hover:bg-stone-50 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-stone-900 truncate">{order.order_code}</p>
                  <p className="text-xs text-stone-500 truncate">
                    {order.customer_name || 'Customer'} · {formatDate(order.created_at)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-stone-900">{formatPrice(order.total)}</p>
                  <span className={`inline-flex mt-1 px-2 py-0.5 rounded-lg border text-[10px] font-medium ${statusColor[order.status] || 'bg-stone-50 text-stone-700 border-stone-100'}`}>
                    {statusLabel[order.status] || order.status}
                  </span>
                </div>
                <ArrowRight size={15} className="text-stone-300" />
              </Link>
            ))}
            {!loading && !data?.recent_orders.length && (
              <div className="p-5 text-sm text-stone-500">Belum ada pesanan.</div>
            )}
          </div>
        </div>}
      </div>
    </div>
  );
}
