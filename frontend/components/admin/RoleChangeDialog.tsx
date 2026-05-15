import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface RoleChangeDialogProps {
  isOpen: boolean;
  currentRole: 'user' | 'admin';
  userName: string;
  onConfirm: (newRole: 'user' | 'admin') => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function RoleChangeDialog({
  isOpen,
  currentRole,
  userName,
  onConfirm,
  onCancel,
  loading = false,
}: RoleChangeDialogProps) {
  const [selectedRole, setSelectedRole] = useState<'user' | 'admin'>(currentRole);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (selectedRole !== currentRole) {
      onConfirm(selectedRole);
    }
  };

  const isDemotingAdmin = currentRole === 'admin' && selectedRole === 'user';
  const isPromotingToAdmin = currentRole === 'user' && selectedRole === 'admin';
  const hasChanged = selectedRole !== currentRole;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={loading ? undefined : onCancel}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
        {/* Close button */}
        <button
          onClick={onCancel}
          disabled={loading}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 transition-colors disabled:opacity-50"
        >
          <X size={20} />
        </button>

        {/* Title */}
        <h3 className="text-lg font-bold text-stone-900 mb-2">Ubah Role User</h3>

        {/* User info */}
        <p className="text-stone-600 text-sm mb-4">
          Mengubah role untuk: <strong>{userName}</strong>
        </p>

        {/* Role selection */}
        <div className="space-y-3 mb-4">
          <label className="flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-colors hover:bg-stone-50">
            <input
              type="radio"
              name="role"
              value="user"
              checked={selectedRole === 'user'}
              onChange={(e) => setSelectedRole(e.target.value as 'user' | 'admin')}
              disabled={loading}
              className="w-4 h-4 text-blue-600"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-stone-900">User</span>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                  User
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                Akses normal sebagai customer
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-colors hover:bg-stone-50">
            <input
              type="radio"
              name="role"
              value="admin"
              checked={selectedRole === 'admin'}
              onChange={(e) => setSelectedRole(e.target.value as 'user' | 'admin')}
              disabled={loading}
              className="w-4 h-4 text-purple-600"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-stone-900">Admin</span>
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                  Admin
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                Akses penuh ke admin panel
              </p>
            </div>
          </label>
        </div>

        {/* Warning for demoting admin */}
        {isDemotingAdmin && (
          <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-100 rounded-xl p-3 mb-4">
            <AlertTriangle size={16} className="text-yellow-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-yellow-900">
              <strong>Peringatan:</strong> User akan kehilangan akses ke admin panel setelah role diubah menjadi User.
            </p>
          </div>
        )}

        {/* Info for promoting to admin */}
        {isPromotingToAdmin && (
          <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4">
            <AlertTriangle size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-900">
              User akan mendapatkan akses penuh ke admin panel setelah role diubah menjadi Admin.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Batal
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || !hasChanged}
            className="px-4 py-2.5 rounded-xl text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Memproses...
              </span>
            ) : (
              'Ubah Role'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
