'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { formatPrice } from '@/lib/utils';

interface OrderItem {
  id: number;
  product_name: string;
  variant_name: string | null;
  quantity: number;
  price: number;
}

interface Order {
  id: number;
  order_code: string;
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
  created_at: string;
  items: OrderItem[];
}

export default function InvoicePage() {
  const params = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();
  }, [params.id]);

  const loadOrder = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/admin/orders/${params.id}`);
      setOrder(data);
      // Trigger print dialog after data loads
      setTimeout(() => {
        window.print();
      }, 500);
    } catch (error) {
      console.error('Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (loading || !order) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-stone-500">Memuat invoice...</p>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4;
            margin: 20mm;
          }
        }
      `}</style>

      <div className="max-w-4xl mx-auto p-8 bg-white">
        {/* Header */}
        <div className="border-b-2 border-stone-800 pb-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-stone-900 mb-2">ILENA INTERIOR</h1>
              <p className="text-sm text-stone-600">Interior Design & Furniture</p>
              <p className="text-sm text-stone-600">Email: info@ilenainterior.com</p>
              <p className="text-sm text-stone-600">Phone: +62 xxx xxxx xxxx</p>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold text-stone-900 mb-2">INVOICE</h2>
              <p className="text-sm text-stone-600">
                <span className="font-semibold">No:</span> {order.order_code}
              </p>
              <p className="text-sm text-stone-600">
                <span className="font-semibold">Tanggal:</span> {formatDate(order.created_at)}
              </p>
            </div>
          </div>
        </div>

        {/* Customer Info */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-stone-900 mb-3 uppercase">Kepada:</h3>
          <div className="bg-stone-50 p-4 rounded-lg">
            <p className="font-semibold text-stone-900">{order.shipping_address.name}</p>
            <p className="text-sm text-stone-700 mt-1">{order.shipping_address.email}</p>
            <p className="text-sm text-stone-700">{order.shipping_address.phone}</p>
            <p className="text-sm text-stone-700 mt-2">
              {order.shipping_address.address}
              {order.shipping_address.city && `, ${order.shipping_address.city}`}
              {order.shipping_address.postal_code && ` ${order.shipping_address.postal_code}`}
            </p>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-8">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-stone-800">
                <th className="text-left py-3 text-sm font-semibold text-stone-900 uppercase">
                  Item
                </th>
                <th className="text-center py-3 text-sm font-semibold text-stone-900 uppercase w-20">
                  Qty
                </th>
                <th className="text-right py-3 text-sm font-semibold text-stone-900 uppercase w-32">
                  Harga
                </th>
                <th className="text-right py-3 text-sm font-semibold text-stone-900 uppercase w-32">
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-b border-stone-200">
                  <td className="py-3 text-stone-800">
                    <p className="font-medium">{item.product_name}</p>
                    {item.variant_name && (
                      <p className="text-xs text-stone-500 mt-0.5">{item.variant_name}</p>
                    )}
                  </td>
                  <td className="py-3 text-center text-stone-700">{item.quantity}</td>
                  <td className="py-3 text-right text-stone-700">{formatPrice(item.price)}</td>
                  <td className="py-3 text-right font-medium text-stone-800">
                    {formatPrice(item.price * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="flex justify-end mb-8">
          <div className="w-80">
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-stone-600">Subtotal:</span>
                <span className="font-medium text-stone-800">{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-stone-600">Ongkos Kirim:</span>
                <span className="font-medium text-stone-800">
                  {formatPrice(order.shipping_cost)}
                </span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-stone-600">Diskon:</span>
                  <span className="font-medium text-red-600">-{formatPrice(order.discount)}</span>
                </div>
              )}
            </div>
            <div className="border-t-2 border-stone-800 pt-3">
              <div className="flex justify-between">
                <span className="text-lg font-bold text-stone-900">TOTAL:</span>
                <span className="text-lg font-bold text-stone-900">{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-stone-200 pt-6 mt-12">
          <div className="text-center text-sm text-stone-500">
            <p>Terima kasih atas kepercayaan Anda kepada ILENA INTERIOR</p>
            <p className="mt-2">Invoice ini dicetak secara otomatis dan sah tanpa tanda tangan</p>
          </div>
        </div>

        {/* Print Button (hidden when printing) */}
        <div className="no-print mt-8 text-center">
          <button
            onClick={() => window.print()}
            className="px-6 py-3 bg-stone-800 text-white rounded-xl font-medium hover:bg-stone-700 transition-colors"
          >
            Cetak Invoice
          </button>
        </div>
      </div>
    </>
  );
}
