import Link from 'next/link';
import { Eye, Users } from 'lucide-react';
import UserRoleBadge from './UserRoleBadge';
import UserStatusBadge from './UserStatusBadge';

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

interface UsersTableProps {
  users: User[];
  loading: boolean;
  onUserClick: (userId: number) => void;
}

export default function UsersTable({ users, loading, onUserClick }: UsersTableProps) {
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-stone-100">
            <tr>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                User
              </th>
              <th className="text-center px-4 py-3.5 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                Role
              </th>
              <th className="text-center px-4 py-3.5 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                Status
              </th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                Terdaftar
              </th>
              <th className="px-4 py-3.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-stone-100 rounded-full animate-pulse" />
                      <div>
                        <div className="h-4 bg-stone-100 rounded animate-pulse w-32 mb-1.5" />
                        <div className="h-3 bg-stone-100 rounded animate-pulse w-40" />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="h-6 bg-stone-100 rounded-full animate-pulse w-16 mx-auto" />
                  </td>
                  <td className="px-4 py-4">
                    <div className="h-6 bg-stone-100 rounded-full animate-pulse w-16 mx-auto" />
                  </td>
                  <td className="px-4 py-4">
                    <div className="h-4 bg-stone-100 rounded animate-pulse w-32" />
                  </td>
                  <td />
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-16 text-stone-400">
                  <Users size={32} className="mx-auto mb-2 opacity-30" />
                  <p>Tidak ada user yang ditemukan</p>
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-stone-50/50 transition-colors cursor-pointer"
                  onClick={() => onUserClick(user.id)}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center text-stone-600 font-medium text-sm">
                          {getInitials(user.name)}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-stone-800">{user.name}</p>
                        <p className="text-xs text-stone-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-center">
                      <UserRoleBadge role={user.role} />
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-center">
                      <UserStatusBadge status={user.status} />
                    </div>
                  </td>
                  <td className="px-4 py-4 text-stone-600">{formatDate(user.created_at)}</td>
                  <td className="px-4 py-4">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="flex items-center gap-1.5 text-stone-600 hover:text-stone-900 text-sm font-medium transition-colors"
                      onClick={(e) => e.stopPropagation()}
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
    </div>
  );
}
