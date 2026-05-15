'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Printer,
  MessageCircle,
  Package,
  User,
  MapPin,
  Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  thumbnail: string | null;
  variant_id: number | null;
  variant_name: string | null;
  variant_color: string | null;
  quantity: number;
  price: number;
}

interface StatusHistory {
  id: number;
  old_status: string;
  new_status: string;
  changed_by: number;
  changed_by_name: string;
  created_at: string;
}

interface Order {
  id: number;
  order_code: string;
  user_id: number;
  status: string;
  subtotal: number;
  shipping_cost: number;
  discount: number;
  total: number;
  shipping_address: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city?: string;
    postal_code?: string;
  };
  notes: string;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  status_history: StatusHistory[];
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

const validTransitions: Record<string, string[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [updating, setUpdating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/orders/${params.id}`);
      setOrder(data);
    } catch (error) {
      toast.error('Gagal memuat detail pesanan');
      router.push('/admin/orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [params.id]);

  const handleStatusUpdate = async () => {
    if (!newStatus || !order) return;

    setUpdating(true);
    try {
      await api.put(`/admin/orders/${order.id}/status`, { status: newStatus });
      toast.success('Status pesanan berhasil diperbarui');
      setShowStatusModal(false);
      setNewStatus('');
      load();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal memperbarui status');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!order) return;
    if (
      !confirm(
        `Hapus pesanan ${order.order_code}? Tindakan ini tidak bisa dibatalkan dan akan menghapus semua data terkait.`
      )
    )
      return;

    try {
      await api.delete(`/admin/orders/${order.id}`);
      toast.success('Pesanan berhasil dihapus');
      router.push('/admin/orders');
    } catch (error) {
      toast.error('Gagal menghapus pesanan');
    }
  };

  const handlePrintInvoice = () => {
    if (!order) return;
    window.open(`/admin/orders/${order.id}/invoice`, '_blank');
  };

  const handleWhatsApp = () => {
    if (!order) return;
    const phone = order.shipping_address.phone.replace(/[^\d+]/g, '');
    const message = `Halo ${order.shipping_address.name}, pesanan Anda #${order.order_code} dengan total ${formatPrice(order.total)} telah ${statusLabels[order.status as keyof typeof statusLabels]}. Terima kasih!`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
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

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-stone-200 rounded w-64 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl border border-stone-100 p-6 h-64" />
              <div className="bg-white rounded-2xl border border-stone-100 p-6 h-96" />
            </div>
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-stone-100 p-6 h-48" />
              <div className="bg-white rounded-2xl border border-stone-100 p-6 h-64" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!order) return null;

  const nextStatuses = validTransitions[order.status] || [];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/orders"
            className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-stone-900">Detail Pesanan</h1>
            <p className="text-stone-500 text-sm mt-1 font-mono">{order.order_code}</p>
          </div>
          <span
            className={`text-sm font-medium px-3 py-1.5 rounded-full ${
              statusColors[order.status as keyof typeof statusColors]
            }`}
          >
            {statusLabels[order.status as keyof typeof statusLabels]}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {order.status === 'pending' && (
            <Link
              href={`/admin/orders/${order.id}/edit`}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 text-stone-700 rounded-xl text-sm font-medium hover:bg-stone-50 transition-colors"
            >
              <Pencil size={16} /> Edit
            </Link>
          )}
          <button
            onClick={handlePrintInvoice}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 text-stone-700 rounded-xl text-sm font-medium hover:bg-stone-50 transition-colors"
          >
            <Printer size={16} /> Invoice
          </button>
          <button
            onClick={handleWhatsApp}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors"
          >
            <MessageCircle size={16} /> WhatsApp
          </button>
          <button
            onClick={handleDelete}
            className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
            title="Hapus Pesanan"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info */}
          <div className="bg-white rounded-2xl border border-stone-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <User size={18} className="text-stone-500" />
              <h2 className="font-semibold text-stone-900">Informasi Customer</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-stone-500 mb-1">Nama</p>
                <p className="font-medium text-stone-800">{order.shipping_address.name}</p>
              </div>
              <div>
                <p className="text-xs text-stone-500 mb-1">Email</p>
                <p className="font-medium text-stone-800">{order.shipping_address.email}</p>
              </div>
              <div>
                <p className="text-xs text-stone-500 mb-1">Telepon</p>
                <p className="font-medium text-stone-800">{order.shipping_address.phone}</p>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bg-white rounded-2xl border border-stone-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={18} className="text-stone-500" />
              <h2 className="font-semibold text-stone-900">Alamat Pengiriman</h2>
            </div>
            <p className="text-stone-700 leading-relaxed">
              {order.shipping_address.address}
              {order.shipping_address.city && `, ${order.shipping_address.city}`}
              {order.shipping_address.postal_code && ` ${order.shipping_address.postal_code}`}
            </p>
          </div>

          {/* Order Items */}
          <div className="bg-white rounded-2xl border border-stone-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Package size={18} className="text-stone-500" />
              <h2 className="font-semibold text-stone-900">Item Pesanan</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-stone-100">
                  <tr>
                    <th className="text-left py-3 text-xs font-semibold text-stone-500 uppercase">
                      Produk
                    </th>
                    <th className="text-center py-3 text-xs font-semibold text-stone-500 uppercase">
                      Qty
                    </th>
                    <th className="text-right py-3 text-xs font-semibold text-stone-500 uppercase">
                      Harga
                    </th>
                    <th className="text-right py-3 text-xs font-semibold text-stone-500 uppercase">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                            {item.thumbnail ? (
                              <Image
                                src={item.thumbnail}
                                alt={item.product_name}
                                fill
                                className="object-cover"
                                sizes="48px"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-stone-300">
                                <Package size={20} />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-stone-800">{item.product_name}</p>
                            {item.variant_name && (
                              <p className="text-xs text-stone-500">{item.variant_name}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-center text-stone-700">{item.quantity}</td>
                      <td className="py-3 text-right text-stone-700">
                        {formatPrice(item.price)}
                      </td>
                      <td className="py-3 text-right font-medium text-stone-800">
                        {formatPrice(item.price * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div className="mt-6 pt-6 border-t border-stone-100">
              <div className="space-y-2 max-w-xs ml-auto">
                <div className="flex justify-between text-sm">
                  <span className="text-stone-600">Subtotal</span>
                  <span className="font-medium text-stone-800">{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-600">Ongkir</span>
                  <span className="font-medium text-stone-800">
                    {formatPrice(order.shipping_cost)}
                  </span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-600">Diskon</span>
                    <span className="font-medium text-red-600">
                      -{formatPrice(order.discount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-stone-200">
                  <span className="text-stone-900">Total</span>
                  <span className="text-stone-900">{formatPrice(order.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="bg-white rounded-2xl border border-stone-100 p-6">
              <h2 className="font-semibold text-stone-900 mb-3">Catatan</h2>
              <p className="text-stone-700 leading-relaxed">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Status Update */}
          {nextStatuses.length > 0 && (
            <div className="bg-white rounded-2xl border border-stone-100 p-6">
              <h2 className="font-semibold text-stone-900 mb-4">Update Status</h2>
              <button
                onClick={() => setShowStatusModal(true)}
                className="w-full px-4 py-2.5 bg-stone-800 text-white rounded-xl text-sm font-medium hover:bg-stone-700 transition-colors"
              >
                Ubah Status
              </button>
            </div>
          )}

          {/* Status History */}
          <div className="bg-white rounded-2xl border border-stone-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={18} className="text-stone-500" />
              <h2 className="font-semibold text-stone-900">Riwayat Status</h2>
            </div>
            <div className="space-y-4">
              {order.status_history.length === 0 ? (
                <div className="text-sm text-stone-500">
                  <p className="font-medium">{statusLabels[order.status as keyof typeof statusLabels]}</p>
                  <p className="text-xs mt-1">{formatDate(order.created_at)}</p>
                </div>
              ) : (
                order.status_history.map((history) => (
                  <div key={history.id} className="relative pl-6 pb-4 border-l-2 border-stone-200 last:border-0 last:pb-0">
                    <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-stone-400" />
                    <div className="text-sm">
                      <p className="font-medium text-stone-800">
                        {statusLabels[history.old_status as keyof typeof statusLabels]} →{' '}
                        {statusLabels[history.new_status as keyof typeof statusLabels]}
                      </p>
                      <p className="text-xs text-stone-500 mt-1">
                        {formatDate(history.created_at)}
                      </p>
                      {history.changed_by_name && (
                        <p className="text-xs text-stone-400 mt-0.5">
                          oleh {history.changed_by_name}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Order Info */}
          <div className="bg-white rounded-2xl border border-stone-100 p-6">
            <h2 className="font-semibold text-stone-900 mb-4">Informasi Pesanan</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-stone-500 text-xs mb-1">Dibuat</p>
                <p className="text-stone-800">{formatDate(order.created_at)}</p>
              </div>
              <div>
                <p className="text-stone-500 text-xs mb-1">Terakhir Diupdate</p>
                <p className="text-stone-800">{formatDate(order.updated_at)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-stone-900 mb-4">Update Status Pesanan</h3>
            <p className="text-sm text-stone-600 mb-4">
              Pilih status baru untuk pesanan {order.order_code}
            </p>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-stone-400 mb-4"
            >
              <option value="">Pilih status...</option>
              {nextStatuses.map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status as keyof typeof statusLabels]}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setShowStatusModal(false);
                  setNewStatus('');
                }}
                className="flex-1 px-4 py-2.5 bg-stone-100 text-stone-700 rounded-xl text-sm font-medium hover:bg-stone-200 transition-colors"
                disabled={updating}
              >
                Batal
              </button>
              <button
                onClick={handleStatusUpdate}
                disabled={!newStatus || updating}
                className="flex-1 px-4 py-2.5 bg-stone-800 text-white rounded-xl text-sm font-medium hover:bg-stone-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updating ? 'Memperbarui...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
