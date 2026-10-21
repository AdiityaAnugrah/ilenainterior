'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  ShieldCheck,
  User,
} from 'lucide-react';

interface AuditLog {
  id: number;
  admin_id: number | null;
  admin_name: string | null;
  admin_email: string | null;
  method: string;
  path: string;
  status_code: number | null;
  ip: string | null;
  user_agent: string | null;
  request_body: Record<string, unknown> | null;
  created_at: string;
}

const methodStyle: Record<string, string> = {
  POST: 'bg-blue-50 text-blue-700 border-blue-100',
  PUT: 'bg-amber-50 text-amber-700 border-amber-100',
  PATCH: 'bg-purple-50 text-purple-700 border-purple-100',
  DELETE: 'bg-red-50 text-red-700 border-red-100',
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getActionLabel(path: string) {
  if (path.includes('/settings')) return 'Pengaturan sistem';
  if (path.includes('/orders')) return 'Pesanan';
  if (path.includes('/products')) return 'Produk';
  if (path.includes('/wallpapers')) return 'Wallpaper';
  if (path.includes('/users')) return 'User';
  return 'Admin';
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/admin/audit-logs?limit=150');
      setLogs(res.data || []);
    } catch {
      setError('Gagal memuat audit log. Coba refresh kembali.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return logs;
    return logs.filter((log) => {
      const haystack = [
        log.admin_name,
        log.admin_email,
        log.method,
        log.path,
        log.ip,
        JSON.stringify(log.request_body || {}),
      ].join(' ').toLowerCase();
      return haystack.includes(keyword);
    });
  }, [logs, query]);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-100 text-stone-600 text-xs font-medium mb-3">
            <ShieldCheck size={14} />
            Security & Activity
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Audit Log Admin</h1>
          <p className="text-stone-500 text-sm mt-1">
            Pantau semua aktivitas penting admin seperti ubah order, produk, user, dan setting.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 disabled:opacity-60"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-stone-100 p-5">
          <p className="text-sm text-stone-500 mb-2">Total Log</p>
          <p className="text-2xl font-bold text-stone-900">{logs.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-100 p-5">
          <p className="text-sm text-stone-500 mb-2">Aksi Berhasil</p>
          <p className="text-2xl font-bold text-emerald-700">
            {logs.filter((log) => Number(log.status_code || 0) < 400).length}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-100 p-5">
          <p className="text-sm text-stone-500 mb-2">Aksi Error</p>
          <p className="text-2xl font-bold text-red-700">
            {logs.filter((log) => Number(log.status_code || 0) >= 400).length}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
        <div className="p-4 border-b border-stone-100">
          <div className="relative">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama admin, email, path, IP, atau isi perubahan..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900/10 focus:border-stone-400"
            />
          </div>
        </div>

        {error && (
          <div className="m-4 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-10 flex items-center justify-center text-stone-500">
            <RefreshCw size={18} className="animate-spin mr-2" />
            Memuat audit log...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-10 text-center">
            <Activity size={34} className="mx-auto text-stone-300 mb-3" />
            <p className="font-semibold text-stone-800">Belum ada log</p>
            <p className="text-sm text-stone-500 mt-1">Aktivitas admin akan muncul di sini.</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {filteredLogs.map((log) => {
              const isError = Number(log.status_code || 0) >= 400;
              return (
                <div key={log.id} className="p-4 hover:bg-stone-50/70 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${methodStyle[log.method] || 'bg-stone-50 text-stone-700 border-stone-100'}`}>
                          {log.method}
                        </span>
                        <span className="text-sm font-semibold text-stone-900">{getActionLabel(log.path)}</span>
                        <span className={`inline-flex items-center gap-1 text-xs ${isError ? 'text-red-600' : 'text-emerald-600'}`}>
                          {isError ? <AlertCircle size={13} /> : <CheckCircle2 size={13} />}
                          {log.status_code || '—'}
                        </span>
                      </div>
                      <p className="text-sm text-stone-600 break-all">{log.path}</p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500 mt-2">
                        <span className="inline-flex items-center gap-1">
                          <User size={13} />
                          {log.admin_name || 'Admin'} {log.admin_email ? `(${log.admin_email})` : ''}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock size={13} />
                          {formatDate(log.created_at)}
                        </span>
                        {log.ip && <span>IP: {log.ip}</span>}
                      </div>
                    </div>

                    {log.request_body && Object.keys(log.request_body).length > 0 && (
                      <details className="lg:w-[420px] rounded-xl border border-stone-100 bg-stone-50">
                        <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-stone-600">
                          Lihat data perubahan
                        </summary>
                        <pre className="max-h-56 overflow-auto px-3 pb-3 text-[11px] leading-relaxed text-stone-700 whitespace-pre-wrap">
                          {JSON.stringify(log.request_body, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
