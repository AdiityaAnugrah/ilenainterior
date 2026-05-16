'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { Plus, Search, Eye, Download, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';

interface Order {
  id: number;
  order_code: string;
  customer_name: string;
  customer_email: string;
  status: string;
  total: number;
  created_at: string;
  updated_at: string;
}

interface StatusCounts {
  all: number;
  pending: number;
  paid: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-blue-100 text-blue-700',
  processing: 'bg-purple-100 text-purple-700',
  shipped: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const statusLabels = {
  pending: 'Pending',
  paid: 'Dibayar',
  processing: 'Diproses',
  shipped: 'Dikirim',
  delivered: 'Selesai',
  cancelled: 'Dibatalkan',
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({
    all: 0,
    pending: 0,
    paid: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
  });

  const limit = 30;

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/admin/orders', {
        params: { search, status: statusFilter, dateFrom, dateTo, page, limit },
      });
      setOrders(data.data);
      setTotal(data.total);
      if (data.statusCounts) {
        setStatusCounts(data.statusCounts);
      }
    } catch (error) {
      toast.error('Gagal memuat pesanan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [search, statusFilter, dateFrom, dateTo, page]);

  const handleExport = async () => {
    try {
      const response = await api.get('/api/admin/orders/export', {
        params: { search, status: statusFilter, dateFrom, dateTo },
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const today = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `orders-export-${today}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Export berhasil');
    } catch (error) {
      toast.error('Gagal export pesanan');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Kelola Pesanan</h1>
          <p className="text-stone-500 text-sm mt-1">{total} pesanan total</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-white border border-stone-200 text-stone-700 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-50 transition-colors"
          >
            <Download size={16} /> Export CSV
          </button>
          <Link
            href="/admin/orders/new"
            className="flex items-center gap-2 bg-stone-800 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-700 transition-colors"
          >
            <Plus size={16} /> Tambah Pesanan
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-stone-100 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kode pesanan atau nama customer..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-stone-400"
            />
          </div>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder="Dari tanggal"
            className="px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-stone-400"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            placeholder="Sampai tanggal"
            className="px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-stone-400"
          />
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {(['all', 'pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'] as const).map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                statusFilter === status
                  ? 'bg-stone-800 text-white'
                  : 'bg-stone-50 text-stone-600 hover:bg-stone-100'
              }`}
            >
              {status === 'all' ? 'Semua' : statusLabels[status as keyof typeof statusLabels]}{' '}
              <span className={`ml-1.5 px-1.5 py-0.5 rounded text-xs ${
                statusFilter === status ? 'bg-white/20' : 'bg-stone-200'
              }`}>
                {statusCounts[status]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-100">
              <tr>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  Kode Pesanan
                </th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  Customer
                </th>
                <th className="text-right px-4 py-3.5 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  Total
                </th>
                <th className="text-center px-4 py-3.5 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  Tanggal
                </th>
                <th className="px-4 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-4">
                      <div className="h-4 bg-stone-100 rounded animate-pulse w-32" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 bg-stone-100 rounded animate-pulse w-40" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 bg-stone-100 rounded animate-pulse w-24 ml-auto" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-6 bg-stone-100 rounded-full animate-pulse w-20 mx-auto" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="h-4 bg-stone-100 rounded animate-pulse w-32" />
                    </td>
                    <td />
                  </tr>
                ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-stone-400">
                    <ShoppingCart size={32} className="mx-auto mb-2 opacity-30" />
                    <p>
                      {search || statusFilter !== 'all' || dateFrom || dateTo
                        ? 'Tidak ada pesanan yang sesuai dengan filter'
                        : 'Belum ada pesanan'}
                    </p>
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-mono font-medium text-stone-800">{order.order_code}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-stone-800">{order.customer_name}</p>
                      <p className="text-xs text-stone-400">{order.customer_email}</p>
                    </td>
                    <td className="px-4 py-4 text-right font-semibold text-stone-800">
                      {formatPrice(order.total)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-center">
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full ${
                            statusColors[order.status as keyof typeof statusColors]
                          }`}
                        >
                          {statusLabels[order.status as keyof typeof statusLabels]}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-stone-600">{formatDate(order.created_at)}</td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="flex items-center gap-1.5 text-stone-600 hover:text-stone-900 text-sm font-medium transition-colors"
                      >
                        <Eye size={15} /> Detail
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-stone-100 px-6 py-4 flex items-center justify-between">
            <p className="text-sm text-stone-500">
              Halaman {page} dari {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-stone-200 text-sm font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Sebelumnya
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg border border-stone-200 text-sm font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
