'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
const fields = [ ['google_tag_manager_id', 'Google Tag Manager ID', 'GTM-XXXXXXX'], ['google_analytics_id', 'Google Analytics ID', 'G-XXXXXXXXXX'], ['tiktok_pixel_id', 'TikTok Pixel ID', 'Pixel ID TikTok'] ];
export function MarketingTrackingSettings() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.get('/api/admin/marketing-settings').then(({ data }) => setValues(data)).catch(() => setFailed(true)).finally(() => setLoading(false)); }, []);
  async function save() {
    setBusy(true);
    try { await api.put('/api/admin/marketing-settings', Object.fromEntries(fields.map(([key]) => [key, values[key] || '']))); toast.success('Tracking disimpan. Website diperbarui maksimal 60 detik.'); }
    catch { toast.error('Gagal menyimpan. Periksa format ID tracking.'); }
    finally { setBusy(false); }
  }
  return <section className="rounded-2xl border border-stone-200 bg-white p-6"><h2 className="font-semibold text-stone-900">Tracking Lainnya</h2>
    <p className="mt-2 text-sm text-stone-600">Kelola ID Google dan TikTok untuk website. Kosongkan ID untuk menonaktifkan integrasinya.</p>
    {loading ? <p className="mt-4">Memuat tracking...</p> : failed ? <p role="alert" className="mt-4 text-red-800">Tracking gagal dimuat. Muat ulang halaman.</p> : <fieldset disabled={busy} className="mt-5 space-y-4 disabled:opacity-50">
      {fields.map(([key, label, placeholder]) => <div key={key}><label htmlFor={key} className="mb-2 block text-sm font-medium">{label}</label><input id={key} value={values[key] || ''} onChange={e => setValues({ ...values, [key]: e.target.value })} placeholder={placeholder} className="min-h-11 w-full rounded-xl border border-stone-300 px-3 text-sm focus-visible:ring-2 focus-visible:ring-emerald-600" /></div>)}
      <button type="button" onClick={save} className="min-h-11 rounded-xl bg-stone-900 px-4 text-sm font-medium text-white focus-visible:ring-2 focus-visible:ring-emerald-600">{busy ? 'Menyimpan...' : 'Simpan Tracking Lainnya'}</button>
    </fieldset>}
  </section>;
}
