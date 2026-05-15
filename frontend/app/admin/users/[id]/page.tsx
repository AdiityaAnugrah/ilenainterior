'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';
import { ArrowLeft, Lock, Shield, Trash2, Ban, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import UserRoleBadge from '@/components/admin/UserRoleBadge';
import UserStatusBadge from '@/components/admin/UserStatusBadge';
import UserDetailCards from '@/components/admin/UserDetailCards';
import UserOrdersTable from '@/components/admin/UserOrdersTable';
import ConfirmationDialog from '@/components/admin/ConfirmationDialog';
import PasswordResetModal from '@/components/admin/PasswordResetModal';
import RoleChangeDialog from '@/components/admin/RoleChangeDialog';

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

interface CustomerAnalytics {
  total_spent: number;
  order_count: number;
  last_order_date: string | null;
  average_order_value: number;
}

interface Order {
  id: number;
  order_code: string;
  status: string;
  total: number;
  created_at: string;
}

interface UserProfile extends User {
  analytics: CustomerAnalytics;
  recent_orders: Order[];
}

export default function UserDetailPage() {
  const router = useRouter();
  const params = useParams();
  const userId = parseInt(params.id as string);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  // Dialog states
  const [blockDialog, setBlockDialog] = useState(false);
  const [unblockDialog, setUnblockDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [resetPasswordDialog, setResetPasswordDialog] = useState(false);
  const [roleChangeDialog, setRoleChangeDialog] = useState(false);
  const [passwordResetModal, setPasswordResetModal] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState('');

  // Get current user ID from auth
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const { data } = await api.get('/auth/me');
        setCurrentUserId(data.id);
      } catch (error) {
        console.error('Failed to fetch current user:', error);
      }
    };
    fetchCurrentUser();
  }, []);

  const loadUser = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/users/${userId}`);
      setUser(data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        toast.error('User tidak ditemukan');
        router.push('/admin/users');
      } else {
        toast.error('Gagal memuat data user');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, [userId]);

  const isViewingOwnAccount = currentUserId === userId;

  // Block user action
  const handleBlock = async () => {
    setActionLoading(true);
    try {
      await api.put(`/admin/users/${userId}/status`, { status: 'blocked' });
      toast.success('User berhasil diblokir');
      setBlockDialog(false);
      await loadUser();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal memblokir user');
    } finally {
      setActionLoading(false);
    }
  };

  // Unblock user action
  const handleUnblock = async () => {
    setActionLoading(true);
    try {
      await api.put(`/admin/users/${userId}/status`, { status: 'active' });
      toast.success('User berhasil diaktifkan kembali');
      setUnblockDialog(false);
      await loadUser();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal mengaktifkan user');
    } finally {
      setActionLoading(false);
    }
  };

  // Reset password action
  const handleResetPassword = async () => {
    setActionLoading(true);
    try {
      const { data } = await api.post(`/admin/users/${userId}/reset-password`);
      setTemporaryPassword(data.temporary_password);
      toast.success('Password berhasil direset');
      setResetPasswordDialog(false);
      setPasswordResetModal(true);
      await loadUser();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal reset password');
    } finally {
      setActionLoading(false);
    }
  };

  // Change role action
  const handleChangeRole = async (newRole: 'user' | 'admin') => {
    setActionLoading(true);
    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole });
      toast.success('Role user berhasil diubah');
      setRoleChangeDialog(false);
      await loadUser();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal mengubah role user');
    } finally {
      setActionLoading(false);
    }
  };

  // Delete user action
  const handleDelete = async () => {
    setActionLoading(true);
    try {
      await api.delete(`/admin/users/${userId}`);
      toast.success('User berhasil dihapus');
      router.push('/admin/users');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal menghapus user');
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="mb-6">
          <div className="h-8 bg-stone-100 rounded animate-pulse w-48 mb-2" />
          <div className="h-4 bg-stone-100 rounded animate-pulse w-64" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-stone-100 p-6 h-64 animate-pulse" />
            <div className="bg-white rounded-2xl border border-stone-100 p-6 h-96 animate-pulse" />
          </div>
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-stone-100 p-6 h-48 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/admin/users')}
          className="flex items-center gap-2 text-stone-600 hover:text-stone-900 mb-4 transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Kembali ke Daftar User</span>
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">{user.name}</h1>
            <p className="text-stone-500 text-sm mt-1">{user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <UserRoleBadge role={user.role} />
            <UserStatusBadge status={user.status} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* User Details */}
          <UserDetailCards user={user} analytics={user.analytics} />

          {/* Order History */}
          <UserOrdersTable orders={user.recent_orders} userId={userId} />
        </div>

        {/* Actions Sidebar */}
        <div className="space-y-6">
          {/* Action Buttons */}
          <div className="bg-white rounded-2xl border border-stone-100 p-6">
            <h3 className="text-sm font-semibold text-stone-900 uppercase tracking-wide mb-4">
              Aksi Admin
            </h3>
            <div className="space-y-3">
              {/* Block/Unblock Button */}
              {!isViewingOwnAccount && (
                <>
                  {user.status === 'active' ? (
                    <button
                      onClick={() => setBlockDialog(true)}
                      className="w-full flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-700 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors"
                    >
                      <Ban size={16} />
                      Blokir User
                    </button>
                  ) : (
                    <button
                      onClick={() => setUnblockDialog(true)}
                      className="w-full flex items-center gap-2 px-4 py-2.5 bg-green-50 text-green-700 rounded-xl text-sm font-medium hover:bg-green-100 transition-colors"
                    >
                      <CheckCircle size={16} />
                      Aktifkan User
                    </button>
                  )}
                </>
              )}

              {/* Reset Password Button */}
              {!isViewingOwnAccount && (
                <button
                  onClick={() => setResetPasswordDialog(true)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 rounded-xl text-sm font-medium hover:bg-blue-100 transition-colors"
                >
                  <Lock size={16} />
                  Reset Password
                </button>
              )}

              {/* Change Role Button */}
              {!isViewingOwnAccount && (
                <button
                  onClick={() => setRoleChangeDialog(true)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 bg-purple-50 text-purple-700 rounded-xl text-sm font-medium hover:bg-purple-100 transition-colors"
                >
                  <Shield size={16} />
                  Ubah Role
                </button>
              )}

              {/* Delete Button */}
              {!isViewingOwnAccount && (
                <button
                  onClick={() => setDeleteDialog(true)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-700 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={16} />
                  Hapus User
                </button>
              )}

              {isViewingOwnAccount && (
                <div className="text-center py-4 text-stone-400 text-sm">
                  Anda tidak dapat mengubah akun Anda sendiri
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmationDialog
        isOpen={blockDialog}
        title="Blokir User"
        message={`Apakah Anda yakin ingin memblokir ${user.name}? User tidak akan dapat login ke sistem.`}
        confirmText="Blokir"
        confirmVariant="danger"
        onConfirm={handleBlock}
        onCancel={() => setBlockDialog(false)}
        loading={actionLoading}
      />

      <ConfirmationDialog
        isOpen={unblockDialog}
        title="Aktifkan User"
        message={`Apakah Anda yakin ingin mengaktifkan kembali ${user.name}? User akan dapat login ke sistem.`}
        confirmText="Aktifkan"
        confirmVariant="primary"
        onConfirm={handleUnblock}
        onCancel={() => setUnblockDialog(false)}
        loading={actionLoading}
      />

      <ConfirmationDialog
        isOpen={resetPasswordDialog}
        title="Reset Password"
        message={`Apakah Anda yakin ingin mereset password ${user.name}? Password sementara akan digenerate dan dikirim ke email user.`}
        confirmText="Reset Password"
        confirmVariant="primary"
        onConfirm={handleResetPassword}
        onCancel={() => setResetPasswordDialog(false)}
        loading={actionLoading}
      />

      <ConfirmationDialog
        isOpen={deleteDialog}
        title="Hapus User"
        message={`Apakah Anda yakin ingin menghapus ${user.name} (${user.email})? Tindakan ini tidak dapat dibatalkan.${
          user.analytics.order_count > 0
            ? ` User ini memiliki ${user.analytics.order_count} order yang akan tetap ada di sistem.`
            : ''
        }`}
        confirmText="Hapus"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog(false)}
        loading={actionLoading}
      />

      {/* Role Change Dialog */}
      <RoleChangeDialog
        isOpen={roleChangeDialog}
        currentRole={user.role}
        userName={user.name}
        onConfirm={handleChangeRole}
        onCancel={() => setRoleChangeDialog(false)}
        loading={actionLoading}
      />

      {/* Password Reset Modal */}
      <PasswordResetModal
        isOpen={passwordResetModal}
        password={temporaryPassword}
        userEmail={user.email}
        onClose={() => {
          setPasswordResetModal(false);
          setTemporaryPassword('');
        }}
      />
    </div>
  );
}
