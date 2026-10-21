'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export function MetaCapiSettings() {
  const [pixel, setPixel] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [token, setToken] = useState('');
  const [hasToken, setHasToken] = useState(false);
  const [clearToken, setClearToken] = useState(false);
  const [testCode, setTestCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');
  useEffect(() => {
    api.get('/api/admin/meta-capi').then(({ data }) => {
      setPixel(data.meta_pixel_id); setEnabled(data.meta_capi_enabled);
      setHasToken(data.has_access_token); setTestCode(data.meta_capi_test_event_code);
    }).catch(() => { setFailed(true); toast.error('Gagal memuat Meta CAPI'); }).finally(() => setLoading(false));
  }, []);
  async function save() {
    setBusy(true); setResult('');
    try {
      const { data } = await api.put('/api/admin/meta-capi', { meta_pixel_id: pixel,
        meta_capi_enabled: enabled, meta_capi_access_token: token, meta_capi_test_event_code: testCode, clear_token: clearToken });
      setHasToken(data.has_access_token); setToken(''); setClearToken(false);
      toast.success('Meta CAPI disimpan. Pixel website diperbarui maksimal 60 detik.');
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(message || 'Gagal menyimpan Meta CAPI');
    } finally { setBusy(false); }
  }
  async function test() {
    setBusy(true); setResult('');
    try { const { data } = await api.post('/api/admin/meta-capi/test'); setResult(data.message); }
    catch (error) { setResult((error as { response?: { data?: { message?: string } } }).response?.data?.message || 'Event uji gagal dikirim'); }
    finally { setBusy(false); }
  }
  const inputClass = 'w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-stone-400';
  return (
    <section className="bg-white rounded-2xl border border-stone-100 p-6" aria-labelledby="meta-capi-title">
      <h2 id="meta-capi-title" className="text-sm font-semibold text-stone-800">Meta Conversions API (CAPI)</h2>
      <p className="text-xs text-stone-500 mt-1 mb-4">Kirim PageView dari server dan Meta Pixel dengan event ID yang sama. Halaman admin dan autentikasi dikecualikan.</p>
      {loading ? <p className="text-sm">Memuat konfigurasi...</p> : failed ? <p role="alert">Konfigurasi gagal dimuat. Muat ulang halaman.</p> : (
        <fieldset disabled={busy} className="space-y-4 disabled:opacity-60">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />Aktifkan Meta CAPI</label>
          <div><label htmlFor="capi-pixel" className="block text-xs font-semibold mb-1.5">Meta Pixel / Dataset ID</label>
            <input id="capi-pixel" className={inputClass} value={pixel} onChange={e => setPixel(e.target.value)} inputMode="numeric" placeholder="873353055789012" />
            <p className="text-xs text-stone-500 mt-1">ID ini digunakan bersama oleh Meta Pixel browser dan CAPI server.</p></div>
          <div><label htmlFor="capi-token" className="block text-xs font-semibold mb-1.5">Conversions API Access Token</label>
            <input id="capi-token" type="password" autoComplete="new-password" className={inputClass} value={token} onChange={e => setToken(e.target.value)} placeholder={hasToken ? 'Token tersimpan — kosongkan untuk tetap memakai token lama' : 'Tempel Access Token dari Events Manager'} />
            <p className="text-xs text-stone-500 mt-1">Token hanya disimpan di backend dan tidak dikirim kembali ke browser.</p></div>
          {hasToken && <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={clearToken} onChange={e => setClearToken(e.target.checked)} />Hapus token tersimpan (nonaktifkan CAPI terlebih dahulu)</label>}
          <div><label htmlFor="capi-test" className="block text-xs font-semibold mb-1.5">Test Event Code (opsional)</label>
            <input id="capi-test" className={inputClass} value={testCode} onChange={e => setTestCode(e.target.value)} placeholder="TEST12345" />
            <p className="text-xs text-stone-500 mt-1">Ambil dari Events Manager → Test Events. Hapus kode setelah pengujian agar event produksi dikirim normal.</p></div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={save} className="bg-stone-800 text-white rounded-xl px-4 py-2 text-sm">{busy ? 'Memproses...' : 'Simpan Meta CAPI'}</button>
            <button type="button" onClick={test} disabled={!hasToken || !testCode.trim()} className="border border-stone-300 rounded-xl px-4 py-2 text-sm disabled:opacity-50">Kirim Event Uji</button>
          </div>
          <p className="text-xs text-stone-500">Tombol uji memakai konfigurasi yang sudah disimpan, termasuk saat CAPI belum aktif.</p>
          {result && <p role="status" className="text-sm text-stone-700">{result}</p>}
        </fieldset>
      )}
    </section>
  );
}
