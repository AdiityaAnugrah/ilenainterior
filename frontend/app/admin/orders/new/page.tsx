'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { ArrowLeft, Plus, X, Search, Package } from 'lucide-react';
import toast from 'react-hot-toast';

interface Product {
  id: number;
  name: string;
  price: number;
  thumbnail: string | null;
  variants?: Variant[];
}

interface Variant {
  id: number;
  name: string;
  color: string | null;
}

interface OrderItem {
  product_id: number;
  product_name: string;
  product_price: number;
  product_thumbnail: string | null;
  variant_id: number | null;
  variant_name: string | null;
  quantity: number;
  price: number;
}

interface User {
  id: number;
  name: string;
  email: string;
}

export default function NewOrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchProduct, setSearchProduct] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);

  // Form state
  const [userId, setUserId] = useState('');
  const [items, setItems] = useState<OrderItem[]>([]);
  const [shippingCost, setShippingCost] = useState('0');
  const [discount, setDiscount] = useState('0');
  const [shippingAddress, setShippingAddress] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
  });
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (searchProduct.length > 2) {
      loadProducts();
    }
  }, [searchProduct]);

  const loadUsers = async () => {
    try {
      const { data } = await api.get('/admin/products'); // Reuse endpoint or create /admin/users
      // For now, we'll need to get users from orders or create a users endpoint
      // Simplified: just allow manual entry
    } catch (error) {
      console.error('Failed to load users');
    }
  };

  const loadProducts = async () => {
    try {
      const { data } = await api.get('/admin/products', {
        params: { search: searchProduct, limit: 10 },
      });
      setProducts(data.data);
    } catch (error) {
      toast.error('Gagal memuat produk');
    }
  };

  const addProduct = async (product: Product) => {
    // Check if product has variants
    if (product.variants && product.variants.length > 0) {
      // For simplicity, add first variant or let user choose
      const variant = product.variants[0];
      const newItem: OrderItem = {
        product_id: product.id,
        product_name: product.name,
        product_price: product.price,
        product_thumbnail: product.thumbnail,
        variant_id: variant.id,
        variant_name: variant.name,
        quantity: 1,
        price: product.price,
      };
      setItems([...items, newItem]);
    } else {
      const newItem: OrderItem = {
        product_id: product.id,
        product_name: product.name,
        product_price: product.price,
        product_thumbnail: product.thumbnail,
        variant_id: null,
        variant_name: null,
        quantity: 1,
        price: product.price,
      };
      setItems([...items, newItem]);
    }
    setShowProductSearch(false);
    setSearchProduct('');
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateQuantity = (index: number, quantity: number) => {
    if (quantity < 1) return;
    const newItems = [...items];
    newItems[index].quantity = quantity;
    setItems(newItems);
  };

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal + parseFloat(shippingCost || '0') - parseFloat(discount || '0');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!userId) {
      toast.error('User ID wajib diisi');
      return;
    }
    if (items.length === 0) {
      toast.error('Minimal satu item harus ditambahkan');
      return;
    }
    if (!shippingAddress.name || !shippingAddress.email || !shippingAddress.phone || !shippingAddress.address) {
      toast.error('Alamat pengiriman tidak lengkap');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/admin/orders', {
        user_id: parseInt(userId),
        items: items.map((item) => ({
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: item.quantity,
          price: item.price,
        })),
        shipping_address: shippingAddress,
        shipping_cost: parseFloat(shippingCost || '0'),
        discount: parseFloat(discount || '0'),
        notes,
      });

      toast.success('Pesanan berhasil dibuat');
      router.push(`/admin/orders/${data.id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal membuat pesanan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/orders" className="p-2 hover:bg-stone-100 rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Tambah Pesanan Baru</h1>
          <p className="text-stone-500 text-sm mt-1">Buat pesanan manual dari admin panel</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Selection */}
            <div className="bg-white rounded-2xl border border-stone-100 p-6">
              <h2 className="font-semibold text-stone-900 mb-4">Customer</h2>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  User ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="Masukkan User ID"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-stone-400"
                  required
                />
                <p className="text-xs text-stone-500 mt-1">
                  ID user yang sudah terdaftar di sistem
                </p>
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-2xl border border-stone-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-stone-900">Item Pesanan</h2>
                <button
                  type="button"
                  onClick={() => setShowProductSearch(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-stone-800 text-white rounded-lg text-sm font-medium hover:bg-stone-700 transition-colors"
                >
                  <Plus size={16} /> Tambah Produk
                </button>
              </div>

              {items.length === 0 ? (
                <div className="text-center py-12 text-stone-400">
                  <Package size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Belum ada item. Tambahkan produk ke pesanan.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 p-4 bg-stone-50 rounded-xl"
                    >
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-stone-200 shrink-0">
                        {item.product_thumbnail ? (
                          <Image
                            src={item.product_thumbnail}
                            alt={item.product_name}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-stone-400">
                            <Package size={24} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-stone-800">{item.product_name}</p>
                        {item.variant_name && (
                          <p className="text-xs text-stone-500">{item.variant_name}</p>
                        )}
                        <p className="text-sm text-stone-600 mt-1">{formatPrice(item.price)}</p>
                      </div>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(index, parseInt(e.target.value))}
                        className="w-20 px-3 py-2 rounded-lg border border-stone-200 text-sm text-center focus:outline-none focus:border-stone-400"
                      />
                      <p className="font-semibold text-stone-800 w-32 text-right">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Shipping Address */}
            <div className="bg-white rounded-2xl border border-stone-100 p-6">
              <h2 className="font-semibold text-stone-900 mb-4">Alamat Pengiriman</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Nama <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={shippingAddress.name}
                    onChange={(e) =>
                      setShippingAddress({ ...shippingAddress, name: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-stone-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={shippingAddress.email}
                    onChange={(e) =>
                      setShippingAddress({ ...shippingAddress, email: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-stone-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Telepon <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={shippingAddress.phone}
                    onChange={(e) =>
                      setShippingAddress({ ...shippingAddress, phone: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-stone-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">Kota</label>
                  <input
                    type="text"
                    value={shippingAddress.city}
                    onChange={(e) =>
                      setShippingAddress({ ...shippingAddress, city: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-stone-400"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Alamat Lengkap <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={shippingAddress.address}
                    onChange={(e) =>
                      setShippingAddress({ ...shippingAddress, address: e.target.value })
                    }
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-stone-400"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Kode Pos
                  </label>
                  <input
                    type="text"
                    value={shippingAddress.postal_code}
                    onChange={(e) =>
                      setShippingAddress({ ...shippingAddress, postal_code: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-stone-400"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-white rounded-2xl border border-stone-100 p-6">
              <h2 className="font-semibold text-stone-900 mb-4">Catatan (Opsional)</h2>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Tambahkan catatan untuk pesanan ini..."
                className="w-full px-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-stone-400"
              />
            </div>
          </div>

          {/* Right Column - Summary */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-stone-100 p-6 sticky top-8">
              <h2 className="font-semibold text-stone-900 mb-4">Ringkasan Pesanan</h2>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-stone-600">Subtotal</span>
                  <span className="font-medium text-stone-800">{formatPrice(subtotal)}</span>
                </div>
                <div>
                  <label className="block text-sm text-stone-600 mb-2">Ongkir</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={shippingCost}
                    onChange={(e) => setShippingCost(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm focus:outline-none focus:border-stone-400"
                  />
                </div>
                <div>
                  <label className="block text-sm text-stone-600 mb-2">Diskon</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm focus:outline-none focus:border-stone-400"
                  />
                </div>
                <div className="flex justify-between text-lg font-bold pt-3 border-t border-stone-200">
                  <span className="text-stone-900">Total</span>
                  <span className="text-stone-900">{formatPrice(total)}</span>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || items.length === 0}
                className="w-full px-4 py-3 bg-stone-800 text-white rounded-xl text-sm font-medium hover:bg-stone-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Membuat Pesanan...' : 'Buat Pesanan'}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Product Search Modal */}
      {showProductSearch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-stone-900">Pilih Produk</h3>
              <button
                onClick={() => {
                  setShowProductSearch(false);
                  setSearchProduct('');
                }}
                className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="relative mb-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchProduct}
                onChange={(e) => setSearchProduct(e.target.value)}
                placeholder="Cari produk..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-stone-400"
                autoFocus
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              {products.length === 0 ? (
                <p className="text-center text-stone-400 py-8">
                  {searchProduct.length > 2 ? 'Tidak ada produk ditemukan' : 'Ketik untuk mencari produk'}
                </p>
              ) : (
                <div className="space-y-2">
                  {products.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => addProduct(product)}
                      className="w-full flex items-center gap-4 p-4 hover:bg-stone-50 rounded-xl transition-colors text-left"
                    >
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                        {product.thumbnail ? (
                          <Image
                            src={product.thumbnail}
                            alt={product.name}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-stone-300">
                            <Package size={24} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-stone-800">{product.name}</p>
                        <p className="text-sm text-stone-600 mt-1">{formatPrice(product.price)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
