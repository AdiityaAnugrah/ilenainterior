import { User, Calendar, DollarSign, ShoppingBag, TrendingUp } from 'lucide-react';

interface UserProfile {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
  role: 'user' | 'admin';
  status: 'active' | 'blocked';
  created_at: string;
  updated_at: string;
}

interface CustomerAnalytics {
  total_spent: number;
  order_count: number;
  last_order_date: string | null;
  average_order_value: number;
}

interface UserDetailCardsProps {
  user: UserProfile;
  analytics: CustomerAnalytics;
}

export default function UserDetailCards({ user, analytics }: UserDetailCardsProps) {
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <div className="bg-white rounded-2xl border border-stone-100 p-6">
        <h3 className="text-sm font-semibold text-stone-900 uppercase tracking-wide mb-4">
          Informasi Profil
        </h3>
        <div className="flex items-start gap-4 mb-6">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-20 h-20 rounded-full object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-stone-200 flex items-center justify-center text-stone-600 font-bold text-xl">
              {getInitials(user.name)}
            </div>
          )}
          <div className="flex-1">
            <h4 className="text-lg font-bold text-stone-900">{user.name}</h4>
            <p className="text-stone-500 text-sm">{user.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-stone-400">ID: {user.id}</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-stone-500 mb-1">Terdaftar</p>
            <p className="text-sm font-medium text-stone-900">{formatDate(user.created_at)}</p>
          </div>
          <div>
            <p className="text-xs text-stone-500 mb-1">Terakhir Diupdate</p>
            <p className="text-sm font-medium text-stone-900">{formatDate(user.updated_at)}</p>
          </div>
        </div>
      </div>

      {/* Analytics Card */}
      <div className="bg-white rounded-2xl border border-stone-100 p-6">
        <h3 className="text-sm font-semibold text-stone-900 uppercase tracking-wide mb-4">
          Statistik Pembelian
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-stone-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={16} className="text-green-600" />
              <p className="text-xs text-stone-500">Total Belanja</p>
            </div>
            <p className="text-lg font-bold text-stone-900">{formatPrice(analytics.total_spent)}</p>
          </div>
          <div className="bg-stone-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingBag size={16} className="text-blue-600" />
              <p className="text-xs text-stone-500">Jumlah Order</p>
            </div>
            <p className="text-lg font-bold text-stone-900">{analytics.order_count}</p>
          </div>
          <div className="bg-stone-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-purple-600" />
              <p className="text-xs text-stone-500">Rata-rata Order</p>
            </div>
            <p className="text-lg font-bold text-stone-900">
              {formatPrice(analytics.average_order_value)}
            </p>
          </div>
          <div className="bg-stone-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={16} className="text-orange-600" />
              <p className="text-xs text-stone-500">Order Terakhir</p>
            </div>
            <p className="text-sm font-bold text-stone-900">
              {analytics.last_order_date ? formatDate(analytics.last_order_date) : 'Belum ada'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
