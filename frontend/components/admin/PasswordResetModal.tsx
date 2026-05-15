import { useState } from 'react';
import { X, Copy, Check, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

interface PasswordResetModalProps {
  isOpen: boolean;
  password: string;
  userEmail: string;
  onClose: () => void;
}

export default function PasswordResetModal({
  isOpen,
  password,
  userEmail,
  onClose,
}: PasswordResetModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      toast.success('Password berhasil disalin');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Gagal menyalin password');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 p-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 transition-colors"
        >
          <X size={20} />
        </button>

        {/* Title */}
        <h3 className="text-lg font-bold text-stone-900 mb-2">Password Berhasil Direset</h3>

        {/* Email notification */}
        <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4">
          <Mail size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-900">
            Email dengan password sementara telah dikirim ke <strong>{userEmail}</strong>
          </p>
        </div>

        {/* Password display */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-stone-700 mb-2">
            Password Sementara
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 font-mono text-sm text-stone-900 select-all">
              {password}
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-3 bg-stone-800 text-white rounded-xl text-sm font-medium hover:bg-stone-900 transition-colors"
            >
              {copied ? (
                <>
                  <Check size={16} />
                  Tersalin
                </>
              ) : (
                <>
                  <Copy size={16} />
                  Salin
                </>
              )}
            </button>
          </div>
        </div>

        {/* Warning message */}
        <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 mb-6">
          <p className="text-sm text-yellow-900 font-medium mb-2">⚠️ Penting:</p>
          <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
            <li>Komunikasikan password ini kepada user dengan cara yang aman</li>
            <li>Instruksikan user untuk segera mengganti password setelah login</li>
            <li>Password ini hanya ditampilkan sekali</li>
          </ul>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full px-4 py-2.5 bg-stone-800 text-white rounded-xl text-sm font-medium hover:bg-stone-900 transition-colors"
        >
          Tutup
        </button>
      </div>
    </div>
  );
}
