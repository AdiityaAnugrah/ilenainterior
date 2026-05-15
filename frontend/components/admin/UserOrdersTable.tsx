import Link from 'next/link';
import { ShoppingBag, ExternalLink } from 'lucide-react';

interface Order {
  id: number;
  order_code: string;
  status: string;
  total: number;
  created_at: string;
}

interface UserOrdersTableProps {
  orders: Order[];
  userId: number;
}

export default function UserOrdersTable({ orders, userId }: UserOrdersTableProps) {
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700' },
      confirmed: { label: 'Dikonfirmasi', className: 'bg-blue-100 text-blue-700' },
      processing: { label: 'Diproses', className: 'bg-purple-100 text-purple-700' },
      shipped: { label: 'Dikirim', className: 'bg-indigo-100 text-indigo-700' },
      delivered: { label: 'Selesai', className: 'bg-green-100 text-green-700' },
      cancelled: { label: 'Dibatalkan', className: 'bg-red-100 text-red-700' },
    };

    const config = statusConfig[status] || { label: status, className: 'bg-stone-100 text-stone-700' };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-900 uppercase tracking-wide">
          Riwayat Order (10 Terakhir)
        </h3>
        {orders.length > 0 && (
          <Link
            href={`/admin/orders?user=${userId}`}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            Lihat Semua <ExternalLink size={14} />
          </Link>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <ShoppingBag size={32} className="mx-auto mb-2 opacity-30" />
          <p>User ini belum memiliki order</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-100">
              <tr>
                <th className="text-left px-6 py-3.5 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  Kode Order
                </th>
                <th className="text-center px-4 py-3.5 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="text-right px-4 py-3.5 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  Total
                </th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  Tanggal
                </th>
                <th className="px-4 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-stone-50/50 transition-colors cursor-pointer"
                  onClick={() => window.location.href = `/admin/orders/${order.id}`}
                >
                  <td className="px-6 py-4">
                    <span className="font-medium text-stone-900">{order.order_code}</span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-center">
                      {getStatusBadge(order.status)}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right font-medium text-stone-900">
                    {formatPrice(order.total)}
                  </td>
                  <td className="px-4 py-4 text-stone-600">
                    {formatDate(order.created_at)}
                  </td>
                  <td className="px-4 py-4">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Detail
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
