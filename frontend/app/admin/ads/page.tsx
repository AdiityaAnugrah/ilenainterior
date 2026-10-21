'use client';
import { useEffect, useState } from 'react';
import { BarChart3, RefreshCw } from 'lucide-react';
import api from '@/lib/api';

interface Report {
  summary: { page_views: number; leads: number; sent: number; skipped: number; failed: number };
  daily: Array<{ day: string; page_views: number; leads: number }>;
  pages: Array<{ source_path: string; page_views: number; leads: number }>;
  tracking: { pixel_id: string; capi_enabled: boolean; has_access_token: boolean; test_mode: boolean };
}

export default function AdsAnalyticsPage() {
  const [days, setDays] = useState(14);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    api.get(`/api/admin/ads-analytics?days=${days}`).then(({ data }) => {
      if (active) { setReport(data); setError(''); }
    }).catch(() => { if (active) setError('Data gagal dimuat. Tekan Refresh untuk mencoba lagi.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [days, refresh]);
  const summary = report?.summary;
  const ratio = summary?.page_views ? (summary.leads / summary.page_views * 100).toFixed(1) + '%' : '—';
  return <div className="mx-auto max-w-7xl p-4 md:p-8">
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div><p className="mb-2 flex items-center gap-2 text-sm font-medium text-emerald-700"><BarChart3 size={18} />Website Funnel · Read-only</p>
        <h1 className="text-2xl font-bold text-stone-900">Analisa Iklan</h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">Pantau PageView, klik konsultasi WhatsApp, dan pengiriman event Meta.</p></div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm text-stone-700">Periode<select value={days} onChange={e => { setLoading(true); setDays(Number(e.target.value)); }} className="ml-2 min-h-11 rounded-xl border border-stone-300 bg-white px-3 focus-visible:ring-2 focus-visible:ring-emerald-600">
          {[7,14,30,90].map(n => <option key={n} value={n}>{n} hari</option>)}</select></label>
        <button disabled={loading} onClick={() => { setLoading(true); setRefresh(n => n + 1); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-stone-900 px-4 text-sm font-medium text-white disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-emerald-600"><RefreshCw size={16} />Refresh</button>
      </div>
    </header>
    <div aria-live="polite">{error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}{loading && <p className="mb-4 text-sm text-stone-600">Memuat analisa...</p>}</div>
    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
      ['PageView', summary?.page_views, 'Event kunjungan, bukan pengunjung unik'],
      ['Klik Konsultasi WA', summary?.leads, 'Klik tombol, bukan chat terkirim'],
      ['Rasio Lead / PageView', ratio, 'Seluruh traffic, bukan atribusi iklan'],
      ['Event Diterima Meta', summary?.sent, 'Respons CAPI berhasil; termasuk event uji'],
    ].map(([label, value, note]) => <section key={label} className="rounded-2xl border border-stone-200 bg-white p-5"><h2 className="text-sm font-medium text-stone-600">{label}</h2><p className="mt-3 text-3xl font-bold tabular-nums text-stone-900">{loading ? '—' : value ?? '—'}</p><p className="mt-2 text-xs leading-5 text-stone-600">{note}</p></section>)}</div>
    <section className="mb-6 rounded-2xl border border-stone-200 bg-white p-5"><h2 className="font-semibold text-stone-900">Status Tracking</h2>
      <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
        <div><dt className="text-stone-600">Pixel ID</dt><dd className="mt-1 font-medium">{report?.tracking.pixel_id || 'Belum diatur'}</dd></div>
        <div><dt className="text-stone-600">CAPI</dt><dd className="mt-1 font-medium">{report?.tracking.capi_enabled && report.tracking.has_access_token ? 'Aktif' : 'Belum aktif'}</dd></div>
        <div><dt className="text-stone-600">Mode Event</dt><dd className="mt-1 font-medium">{report?.tracking.test_mode ? 'Test Events' : 'Produksi'}</dd></div>
        <div><dt className="text-stone-600">Pengiriman CAPI</dt><dd className="mt-1 font-medium">{summary?.skipped ?? 0} dilewati · {summary?.failed ?? 0} gagal</dd></div>
      </dl><p className="mt-4 text-xs leading-5 text-stone-600">Data mulai terkumpul sejak fitur diaktifkan dan mencakup seluruh traffic website. Biaya iklan, ROAS, dan performa per campaign tetap dilihat di Meta Ads Manager. Status diterima bukan bukti atribusi konversi.</p>
    </section>
    <div className="grid gap-6 xl:grid-cols-2">{[
      { title: 'Event Harian', label: 'Tanggal', rows: report?.daily.map(row => ({ key: row.day, ...row })) },
      { title: 'Halaman Sumber Lead', label: 'Halaman', rows: report?.pages.map(row => ({ key: row.source_path, ...row })) },
    ].map(table => <section key={table.title} className="overflow-hidden rounded-2xl border border-stone-200 bg-white"><h2 className="p-5 font-semibold text-stone-900">{table.title}</h2>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-stone-50 text-stone-600"><tr><th scope="col" className="p-4">{table.label}</th><th scope="col" className="p-4">PageView</th><th scope="col" className="p-4">Lead WA</th></tr></thead>
        <tbody>{table.rows?.map(row => <tr key={row.key} className="border-t border-stone-100"><th scope="row" className="max-w-64 break-all p-4 font-medium">{row.key}</th><td className="p-4 tabular-nums">{row.page_views}</td><td className="p-4 tabular-nums">{row.leads}</td></tr>)}</tbody></table></div>
      {!loading && !table.rows?.length && <p className="p-5 text-sm text-stone-600">Belum ada event pada periode ini.</p>}</section>)}</div>
  </div>;
}
