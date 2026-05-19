'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import UsersTable from '@/components/admin/UsersTable';
import { Search, Download, Users as UsersIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import Pagination from '@/components/admin/Pagination';

interface User {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
  role: 'user' | 'admin';
  status: 'active' | 'blocked';
  created_at: string;
  updated_at: string;
}

interface StatusCounts {
  all: number;
  active: number;
  blocked: number;
}

interface RoleCounts {
  user: number;
  admin: number;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({
    all: 0,
    active: 0,
    blocked: 0,
  });
  const [roleCounts, setRoleCounts] = useState<RoleCounts>({
    user: 0,
    admin: 0,
  });

  const limit = 30;

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/admin/users', {
        params: { 
          search, 
          role: roleFilter, 
          status: statusFilter, 
          page, 
          limit 
        },
      });
      setUsers(data.data);
      setTotal(data.total);
      if (data.statusCounts) {
        setStatusCounts(data.statusCounts);
      }
      if (data.roleCounts) {
        setRoleCounts(data.roleCounts);
      }
    } catch (error) {
      toast.error('Gagal memuat data user');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, 500); // 500ms debounce
    return () => clearTimeout(t);
  }, [search, roleFilter, statusFilter, page]);

  const handleExport = async () => {
    try {
      const response = await api.get('/api/admin/users/export', {
        params: { search, role: roleFilter, status: statusFilter },
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const today = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `users-export-${today}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Export berhasil');
    } catch (error) {
      toast.error('Gagal export data user');
    }
  };

  const handleUserClick = (userId: number) => {
    router.push(`/admin/users/${userId}`);
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Kelola User</h1>
          <p className="text-stone-500 text-sm mt-1">{total} user total</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-white border border-stone-200 text-stone-700 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-50 transition-colors"
          >
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-stone-100 p-6 mb-6">
        <div className="mb-4">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Cari nama atau email user..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-stone-400"
            />
          </div>
        </div>

        {/* Role Filter Tabs */}
        <div className="mb-3">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Role</p>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {(['all', 'user', 'admin'] as const).map((role) => (
              <button
                key={role}
                onClick={() => {
                  setRoleFilter(role);
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  roleFilter === role
                    ? 'bg-stone-800 text-white'
                    : 'bg-stone-50 text-stone-600 hover:bg-stone-100'
                }`}
              >
                {role === 'all' ? 'Semua' : role === 'user' ? 'User' : 'Admin'}{' '}
                <span className={`ml-1.5 px-1.5 py-0.5 rounded text-xs ${
                  roleFilter === role ? 'bg-white/20' : 'bg-stone-200'
                }`}>
                  {role === 'all' ? statusCounts.all : roleCounts[role as keyof RoleCounts]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div>
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Status</p>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {(['all', 'active', 'blocked'] as const).map((status) => (
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
                {status === 'all' ? 'Semua' : status === 'active' ? 'Aktif' : 'Diblokir'}{' '}
                <span className={`ml-1.5 px-1.5 py-0.5 rounded text-xs ${
                  statusFilter === status ? 'bg-white/20' : 'bg-stone-200'
                }`}>
                  {statusCounts[status as keyof StatusCounts]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <UsersTable users={users} loading={loading} onUserClick={handleUserClick} />

      {/* Pagination */}
      <div className="bg-white rounded-2xl border border-stone-100 mt-4 overflow-hidden">
        <Pagination
          page={page}
          total={total}
          limit={limit}
          onChange={setPage}
          itemLabel="user"
        />
      </div>
    </div>
  );
}
