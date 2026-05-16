'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Save, MessageCircle, Phone } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminSettingsPage() {
  const [waNumber, setWaNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/admin/settings')
      .then(r => {
        setWaNumber(r.data.whatsapp_number || '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!waNumber.trim()) { toast.error('Nomor WA wajib diisi'); return; }
    setSaving(true);
    try {
      await api.put('/api/admin/settings', { key: 'whatsapp_number', value: waNumber.trim() });
      toast.success('Pengaturan disimpan');
    } catch {
      toast.error('Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Pengaturan</h1>
        <p className="text-stone-500 text-sm mt-1">Konfigurasi umum aplikasi</p>
      </div>

      {/* WhatsApp Settings */}
      <div className="bg-white rounded-2xl border border-stone-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
            <MessageCircle size={20} className="text-green-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-stone-800">WhatsApp Business</h2>
            <p className="text-xs text-stone-500">Nomor tujuan untuk tombol &quot;Konsultasi via WA&quot;</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">
              <Phone size={12} className="inline mr-1" />
              Nomor WhatsApp
            </label>
            <input
              type="text"
              value={waNumber}
              onChange={e => setWaNumber(e.target.value)}
              placeholder="6281234567890"
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-stone-400"
            />
            <p className="text-[10px] text-stone-400 mt-1">
              Format: kode negara + nomor tanpa spasi/tanda. Contoh: 6281234567890
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-stone-800 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-700 transition-colors disabled:opacity-50"
          >
            <Save size={15} />
            {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </div>

        {/* Preview */}
        {waNumber && (
          <div className="mt-5 p-3 bg-stone-50 rounded-xl border border-stone-100">
            <p className="text-xs text-stone-500 mb-1">Preview link WA:</p>
            <a
              href={`https://wa.me/${waNumber.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-green-600 hover:underline break-all"
            >
              https://wa.me/{waNumber.replace(/[^0-9]/g, '')}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
