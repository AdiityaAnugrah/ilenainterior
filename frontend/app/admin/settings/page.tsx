'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Save, MessageCircle, Phone, BarChart3, Info } from 'lucide-react';
import toast from 'react-hot-toast';

type TrackingSettings = {
  google_tag_manager_id: string;
  google_analytics_id: string;
  tiktok_pixel_id: string;
  meta_pixel_id: string;
};

const emptyTracking: TrackingSettings = {
  google_tag_manager_id: '',
  google_analytics_id: '',
  tiktok_pixel_id: '',
  meta_pixel_id: '',
};

const trackingFields = [
  {
    key: 'google_tag_manager_id',
    label: 'Google Tag Manager ID',
    placeholder: 'GTM-WDX5G7H5',
    helper: 'Isi ID GTM saja. Script dan noscript otomatis dipasang ke semua halaman.',
  },
  {
    key: 'google_analytics_id',
    label: 'Google Analytics Measurement ID',
    placeholder: 'G-XXXXXXXXXX',
    helper: 'Opsional. Pakai kalau GA4 tidak dikelola lewat GTM.',
  },
  {
    key: 'tiktok_pixel_id',
    label: 'TikTok Pixel ID',
    placeholder: 'CXXXXXXXXXXXXXXXXXXX',
    helper: 'Pixel TikTok untuk tracking iklan dan event PageView.',
  },
  {
    key: 'meta_pixel_id',
    label: 'Meta/Facebook Pixel ID',
    placeholder: '873353055789012',
    helper: 'Pixel Meta untuk Facebook/Instagram Ads.',
  },
] as const;

export default function AdminSettingsPage() {
  const [waNumber, setWaNumber] = useState('');
  const [waMessage, setWaMessage] = useState('Halo Ilena, mau tanya tanya koleksinya.');
  const [tracking, setTracking] = useState<TrackingSettings>(emptyTracking);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/admin/settings')
      .then(r => {
        setWaNumber(r.data.whatsapp_number || '');
        setWaMessage(r.data.whatsapp_message || 'Halo Ilena, mau tanya tanya koleksinya.');
        setTracking({
          google_tag_manager_id: r.data.google_tag_manager_id || '',
          google_analytics_id: r.data.google_analytics_id || '',
          tiktok_pixel_id: r.data.tiktok_pixel_id || '',
          meta_pixel_id: r.data.meta_pixel_id || '',
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const saveSetting = (key: string, value: string) =>
    api.put('/api/admin/settings', { key, value: value.trim() });

  const handleSave = async () => {
    if (!waNumber.trim()) { toast.error('Nomor WA wajib diisi'); return; }
    if (!waMessage.trim()) { toast.error('Pesan WA wajib diisi'); return; }
    setSaving(true);
    try {
      await Promise.all([
        saveSetting('whatsapp_number', waNumber),
        saveSetting('whatsapp_message', waMessage),
        ...trackingFields.map((field) => saveSetting(field.key, tracking[field.key])),
      ]);
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
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Pengaturan</h1>
        <p className="text-stone-500 text-sm mt-1">Konfigurasi umum aplikasi, WhatsApp, dan tracking iklan</p>
      </div>

      <div className="space-y-6">
        {/* WhatsApp Settings */}
        <section className="bg-white rounded-2xl border border-stone-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <MessageCircle size={20} className="text-green-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-stone-800">WhatsApp Business</h2>
              <p className="text-xs text-stone-500">Nomor tujuan untuk tombol &quot;Konsultasi via WA&quot;</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">
              <Phone size={12} className="inline mr-1" />
              Nomor WhatsApp
            </label>
            <input
              type="tel"
              value={waNumber}
              onChange={e => setWaNumber(e.target.value)}
              placeholder="6281234567890"
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-stone-400"
            />
            <p className="text-[10px] text-stone-400 mt-1">
              Format: kode negara + nomor tanpa spasi/tanda. Contoh: 6281234567890
            </p>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">
              Pesan Default Tombol WhatsApp
            </label>
            <textarea
              value={waMessage}
              onChange={e => setWaMessage(e.target.value)}
              rows={4}
              placeholder="Halo Ilena, mau tanya tanya koleksinya."
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-stone-400 resize-y"
            />
            <p className="text-[10px] text-stone-400 mt-1">
              Pesan ini otomatis masuk ke chat saat pengunjung menekan tombol WhatsApp di web.
            </p>
          </div>

          {waNumber && (
            <div className="mt-5 p-3 bg-stone-50 rounded-xl border border-stone-100">
              <p className="text-xs text-stone-500 mb-1">Preview link WA:</p>
              <a
                href={`https://wa.me/${waNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(waMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-green-600 hover:underline break-all"
              >
                https://wa.me/{waNumber.replace(/[^0-9]/g, '')}?text={encodeURIComponent(waMessage)}
              </a>
              <p className="text-xs text-stone-500 mt-3 mb-1">Preview pesan:</p>
              <div className="whitespace-pre-wrap rounded-lg bg-white border border-stone-100 p-3 text-xs text-stone-700">
                {waMessage}
              </div>
            </div>
          )}
        </section>

        {/* Tracking Settings */}
        <section className="bg-white rounded-2xl border border-stone-100 p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <BarChart3 size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-stone-800">Tracking & Pixel Iklan</h2>
              <p className="text-xs text-stone-500">Cukup isi ID. Script otomatis dipasang di semua halaman website.</p>
            </div>
          </div>

          <div className="mb-4 flex gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-xs text-blue-800">
            <Info size={14} className="mt-0.5 flex-shrink-0" />
            <p>
              Jangan paste kode script penuh. Masukkan ID seperti <b>GTM-XXXX</b>, <b>G-XXXX</b>, TikTok Pixel ID,
              atau Meta Pixel ID saja agar aman dan mudah dikelola.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trackingFields.map((field) => (
              <div key={field.key}>
                <label className="block text-xs font-semibold text-stone-600 mb-1.5">
                  {field.label}
                </label>
                <input
                  type="text"
                  value={tracking[field.key]}
                  onChange={(e) => setTracking(prev => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-stone-400"
                />
                <p className="text-[10px] text-stone-400 mt-1">{field.helper}</p>
              </div>
            ))}
          </div>
        </section>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-stone-800 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-700 transition-colors disabled:opacity-50"
        >
          <Save size={15} />
          {saving ? 'Menyimpan...' : 'Simpan Semua Pengaturan'}
        </button>
      </div>
    </div>
  );
}
