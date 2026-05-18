'use client';
import { useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Upload, FileSpreadsheet, Download, AlertCircle,
  CheckCircle2, X, Loader2, Sparkles, Image as ImageIcon, Box, PlayCircle, Pencil,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { optimizeGlb, optimizeImage, fmt } from '@/lib/optimizeAssets';

interface CurrentProduct {
  id: number; sku: string; name: string; category: string;
  price: number; stock: number;
  width: number; depth: number; height: number;
  description: string; tags: string; is_active: number;
  thumbnail: string | null; model_3d: string | null;
}

interface PreviewRow {
  row: number;
  data: Partial<CurrentProduct>;
  current: CurrentProduct | null;
  changedFields: string[];
  errors: string[];
}

interface PreviewResponse {
  totalRows: number;
  okCount: number;
  errCount: number;
  rows: PreviewRow[];
}

interface UpdateRowState {
  row: PreviewRow;
  thumbnailFile?: File;
  modelFile?: File;
  status: 'pending' | 'optimizing' | 'uploading' | 'success' | 'error' | 'skipped';
  error?: string;
}

type Step = 'upload' | 'preview' | 'updating' | 'done';

const ACCEPT_IMG = ['.jpg', '.jpeg', '.png', '.webp'];
const ACCEPT_GLB = ['.glb'];

const FIELD_LABELS: Record<string, string> = {
  name: 'Nama', category: 'Kategori', price: 'Harga', stock: 'Stok',
  width: 'Lebar', depth: 'Kedalaman', height: 'Tinggi',
  description: 'Deskripsi', tags: 'Tags', is_active: 'Status',
};

function baseName(filename: string): string {
  return filename.replace(/\.[^.]+$/, '').toLowerCase();
}
function ext(filename: string): string {
  const m = filename.toLowerCase().match(/\.[^.]+$/);
  return m ? m[0] : '';
}
function fmtVal(field: string, v: unknown): string {
  if (v === undefined || v === null || v === '') return '—';
  if (field === 'price') return `Rp ${Number(v).toLocaleString('id-ID')}`;
  if (field === 'is_active') return v ? 'Aktif' : 'Nonaktif';
  return String(v);
}

export default function ProductsBulkUpdatePage() {
  const router = useRouter();
  const xlsxRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('upload');
  const [xlsxFile, setXlsxFile] = useState<File | null>(null);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [updateRows, setUpdateRows] = useState<UpdateRowState[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);

  const mediaIndex = useMemo(() => {
    const map = new Map<string, { thumb?: File; model?: File }>();
    for (const f of mediaFiles) {
      const e = ext(f.name);
      const base = baseName(f.name);
      const slot = map.get(base) || {};
      if (ACCEPT_IMG.includes(e) && !slot.thumb) slot.thumb = f;
      else if (ACCEPT_GLB.includes(e) && !slot.model) slot.model = f;
      map.set(base, slot);
    }
    return map;
  }, [mediaFiles]);

  const handleDownloadTemplate = async () => {
    try {
      const res = await api.get('/api/admin/products/import/update-template', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url;
      a.download = 'template_update_produk_ilena.xlsx';
      a.click(); URL.revokeObjectURL(url);
    } catch { toast.error('Gagal download template'); }
  };

  const handleXlsxPick = (f: File | null) => {
    if (!f) { setXlsxFile(null); setPreview(null); return; }
    if (!/\.xlsx$/i.test(f.name)) { toast.error('File harus .xlsx'); return; }
    setXlsxFile(f); setPreview(null);
  };

  const handleMediaPick = (files: FileList | File[] | null) => {
    if (!files) return;
    const arr = Array.from(files);
    const valid = arr.filter(f => {
      const e = ext(f.name);
      return ACCEPT_IMG.includes(e) || ACCEPT_GLB.includes(e);
    });
    if (valid.length < arr.length) {
      toast(`${arr.length - valid.length} file diabaikan (format tidak didukung)`, { icon: '⚠️' });
    }
    setMediaFiles(prev => {
      const map = new Map(prev.map(f => [f.name.toLowerCase(), f]));
      for (const f of valid) map.set(f.name.toLowerCase(), f);
      return Array.from(map.values());
    });
  };

  const handlePreview = async () => {
    if (!xlsxFile) { toast.error('Upload file xlsx dulu'); return; }
    setPreviewing(true);
    try {
      const fd = new FormData();
      fd.append('xlsx', xlsxFile);
      const { data } = await api.post<PreviewResponse>('/api/admin/products/import/update-preview', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreview(data);
      setStep('preview');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal memproses file');
    } finally { setPreviewing(false); }
  };

  const startUpdate = async () => {
    if (!preview) return;
    const validRows = preview.rows.filter(r => r.errors.length === 0 && r.current);
    if (validRows.length === 0) { toast.error('Tidak ada baris valid untuk di-update'); return; }

    const initial: UpdateRowState[] = validRows.map(row => {
      const base = baseName(row.data.sku || '');
      const slot = mediaIndex.get(base);
      return { row, thumbnailFile: slot?.thumb, modelFile: slot?.model, status: 'pending' };
    });

    setUpdateRows(initial);
    setCurrentIdx(0);
    setStep('updating');
    setStartedAt(Date.now());

    for (let i = 0; i < initial.length; i++) {
      setCurrentIdx(i);
      const item = initial[i];
      const updateItem = (patch: Partial<UpdateRowState>) => {
        setUpdateRows(prev => {
          const next = [...prev]; next[i] = { ...next[i], ...patch }; return next;
        });
        Object.assign(item, patch);
      };

      try {
        updateItem({ status: 'optimizing' });

        let thumb = item.thumbnailFile;
        let model = item.modelFile;

        if (thumb) {
          try {
            const { blob, filename } = await optimizeImage(thumb, { maxDimension: 2048, quality: 0.85 });
            thumb = new File([blob], filename, { type: blob.type || 'image/webp' });
          } catch { /* keep original */ }
        }
        if (model) {
          try {
            const { blob } = await optimizeGlb(model, { maxTextureSize: 2048, textureQuality: 0.85 });
            model = new File([blob], model.name, { type: 'model/gltf-binary' });
          } catch { /* keep original */ }
        }

        updateItem({ status: 'uploading' });

        // Merge: new value if provided, else current
        const cur = item.row.current!;
        const d = item.row.data;
        const pick = <K extends keyof CurrentProduct>(k: K) => (d[k] !== undefined ? d[k] : cur[k]) as CurrentProduct[K];

        const fd = new FormData();
        fd.append('name',        String(pick('name')));
        fd.append('category',    String(pick('category')));
        fd.append('description', String(pick('description') ?? ''));
        fd.append('price',       String(pick('price')));
        fd.append('width',       String(pick('width')));
        fd.append('depth',       String(pick('depth')));
        fd.append('height',      String(pick('height')));
        fd.append('tags',        String(pick('tags') ?? ''));
        fd.append('stock',       String(pick('stock')));
        fd.append('is_active',   String(pick('is_active')));
        if (thumb) fd.append('thumbnail', thumb);
        if (model) fd.append('model_3d',  model);

        await api.put(`/api/admin/products/${cur.id}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        updateItem({ status: 'success' });
      } catch (err: any) {
        const msg = err?.response?.data?.message || err?.message || 'Update gagal';
        updateItem({ status: 'error', error: msg });
      }
    }

    setStep('done');
  };

  const successCount = updateRows.filter(r => r.status === 'success').length;
  const errorCount = updateRows.filter(r => r.status === 'error').length;
  const elapsed = startedAt ? Math.round((Date.now() - startedAt) / 1000) : 0;

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/products" className="p-2 rounded-lg hover:bg-stone-100 text-stone-500 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Update Banyak Produk</h1>
          <p className="text-stone-500 text-sm mt-0.5">Ubah harga / stok / data produk yang sudah ada via Excel</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-8">
        {[
          { id: 'upload', label: '1. Upload File' },
          { id: 'preview', label: '2. Preview Perubahan' },
          { id: 'updating', label: '3. Update' },
        ].map((s, i, arr) => {
          const stepOrder = ['upload', 'preview', 'updating', 'done'];
          const cur = stepOrder.indexOf(step);
          const me = stepOrder.indexOf(s.id);
          const done = cur > me;
          const active = cur === me || (s.id === 'updating' && step === 'done');
          return (
            <div key={s.id} className="flex items-center gap-2">
              <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${active ? 'bg-stone-800 text-white' : done ? 'bg-blue-100 text-blue-700' : 'bg-stone-100 text-stone-400'}`}>
                {s.label}
              </div>
              {i < arr.length - 1 && <div className={`w-8 h-px ${done ? 'bg-blue-400' : 'bg-stone-200'}`} />}
            </div>
          );
        })}
      </div>

      {step === 'upload' && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <Pencil size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-blue-900 mb-1">Cara kerja Update Massal</h3>
                <ul className="text-xs text-blue-700 space-y-1 list-disc pl-4 mb-3">
                  <li><strong>SKU wajib diisi</strong> — dipakai untuk cari produk yang udah ada</li>
                  <li><strong>Kolom kosong</strong> = field itu tidak diubah (nilai lama tetap)</li>
                  <li><strong>Kolom diisi</strong> = update ke nilai baru</li>
                  <li>SKU yang tidak ada di database akan di-skip</li>
                  <li>File foto/GLB opsional — kalau ada, akan <strong>menggantikan</strong> yang lama</li>
                </ul>
                <button onClick={handleDownloadTemplate} className="inline-flex items-center gap-2 bg-blue-600 text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  <Download size={13} /> Download template_update_produk_ilena.xlsx
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">File Excel *</label>
            <div
              onClick={() => xlsxRef.current?.click()}
              className="border-2 border-dashed border-stone-200 hover:border-stone-400 rounded-2xl p-6 cursor-pointer transition-colors bg-stone-50"
            >
              {xlsxFile ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet size={22} className="text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-stone-800">{xlsxFile.name}</p>
                      <p className="text-xs text-stone-500">{fmt(xlsxFile.size)} · Klik untuk ganti</p>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleXlsxPick(null); }} className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                    <X size={15} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-4">
                  <Upload size={22} className="text-stone-400" />
                  <p className="text-sm font-medium text-stone-600">Klik atau drop file .xlsx di sini</p>
                  <p className="text-xs text-stone-400">Berisi SKU + field yang mau di-update</p>
                </div>
              )}
              <input ref={xlsxRef} type="file" accept=".xlsx" className="hidden" onChange={(e) => handleXlsxPick(e.target.files?.[0] || null)} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              File Foto & GLB (opsional)
              <span className="ml-2 text-xs text-stone-400 font-normal">Nama file = SKU (misal SOF-001.jpg). Akan <strong className="text-amber-600">menggantikan</strong> yang lama.</span>
            </label>
            <div
              onClick={() => mediaRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleMediaPick(e.dataTransfer.files); }}
              className="border-2 border-dashed border-stone-200 hover:border-stone-400 rounded-2xl p-6 cursor-pointer transition-colors bg-stone-50"
            >
              <div className="flex flex-col items-center gap-2 py-4">
                <div className="flex items-center gap-2 text-stone-400">
                  <ImageIcon size={20} /><Box size={20} />
                </div>
                <p className="text-sm font-medium text-stone-600">
                  {mediaFiles.length > 0 ? `${mediaFiles.length} file dipilih` : 'Klik atau drop file foto/GLB sekaligus'}
                </p>
                <p className="text-xs text-stone-400">.jpg, .png, .webp, .glb</p>
              </div>
              <input ref={mediaRef} type="file" multiple accept=".jpg,.jpeg,.png,.webp,.glb" className="hidden" onChange={(e) => handleMediaPick(e.target.files)} />
            </div>
            {mediaFiles.length > 0 && (
              <div className="mt-3 max-h-40 overflow-y-auto bg-stone-50 rounded-xl p-3 text-xs space-y-1">
                {mediaFiles.map((f, i) => (
                  <div key={i} className="flex items-center justify-between text-stone-600">
                    <span className="truncate">{f.name} <span className="text-stone-400">({fmt(f.size)})</span></span>
                    <button onClick={() => setMediaFiles(prev => prev.filter((_, j) => j !== i))} className="text-stone-400 hover:text-red-500 ml-2">
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePreview}
              disabled={!xlsxFile || previewing}
              className="inline-flex items-center gap-2 bg-stone-800 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-700 disabled:opacity-50 transition-colors"
            >
              {previewing ? <Loader2 size={15} className="animate-spin" /> : <PlayCircle size={15} />}
              {previewing ? 'Memvalidasi...' : 'Preview Perubahan'}
            </button>
            <Link href="/admin/products" className="text-sm text-stone-500 hover:text-stone-700">Batal</Link>
          </div>
        </div>
      )}

      {step === 'preview' && preview && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Total Baris" value={preview.totalRows} color="stone" />
            <StatCard label="Siap Update" value={preview.okCount} color="blue" />
            <StatCard label="Error / Tidak Ada" value={preview.errCount} color="red" />
          </div>

          {preview.errCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <span>Baris error/SKU tidak ditemukan akan di-skip. Fix di Excel + re-upload kalau mau ikut update.</span>
            </div>
          )}

          <div className="space-y-2">
            {preview.rows.map((r) => {
              const base = baseName(r.data.sku || '');
              const slot = mediaIndex.get(base);
              const hasErr = r.errors.length > 0;
              const noChange = !hasErr && r.changedFields.length === 0 && !slot?.thumb && !slot?.model;
              return (
                <div key={r.row} className={`bg-white border rounded-xl p-3 text-xs ${hasErr ? 'border-red-200 bg-red-50/30' : noChange ? 'border-stone-100' : 'border-blue-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-stone-400">Baris {r.row}</span>
                      <span className="font-mono font-medium text-stone-700">{r.data.sku || '—'}</span>
                      {r.current && <span className="text-stone-500">· {r.current.name}</span>}
                    </div>
                    {hasErr ? (
                      <span className="text-red-600 text-[11px]">{r.errors.join('; ')}</span>
                    ) : noChange ? (
                      <span className="text-stone-400 text-[11px]">Tidak ada perubahan</span>
                    ) : (
                      <span className="text-blue-600 text-[11px] inline-flex items-center gap-1"><CheckCircle2 size={11} /> {r.changedFields.length + (slot?.thumb ? 1 : 0) + (slot?.model ? 1 : 0)} perubahan</span>
                    )}
                  </div>
                  {!hasErr && r.current && (r.changedFields.length > 0 || slot?.thumb || slot?.model) && (
                    <div className="flex flex-wrap gap-2 ml-1">
                      {r.changedFields.map(f => (
                        <span key={f} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                          <strong>{FIELD_LABELS[f] || f}:</strong>
                          <span className="line-through text-blue-400">{fmtVal(f, (r.current as any)[f])}</span>
                          <span>→</span>
                          <span>{fmtVal(f, (r.data as any)[f])}</span>
                        </span>
                      ))}
                      {slot?.thumb && (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 px-2 py-0.5 rounded">
                          <ImageIcon size={10} /> Foto akan diganti: {slot.thumb.name}
                        </span>
                      )}
                      {slot?.model && (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 px-2 py-0.5 rounded">
                          <Box size={10} /> GLB akan diganti: {slot.model.name}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-3 sticky bottom-3 bg-white/95 backdrop-blur-sm p-3 rounded-xl border border-stone-100 shadow-sm">
            <button
              onClick={startUpdate}
              disabled={preview.okCount === 0}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Sparkles size={15} /> Update {preview.okCount} produk
            </button>
            <button
              onClick={() => { setStep('upload'); setPreview(null); }}
              className="text-sm text-stone-500 hover:text-stone-700"
            >
              ← Kembali ke upload
            </button>
          </div>
        </div>
      )}

      {(step === 'updating' || step === 'done') && (
        <div className="space-y-5">
          {step === 'updating' && (
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2 text-sm">
                <span className="font-medium text-stone-700">
                  {currentIdx + 1} / {updateRows.length} — {updateRows[currentIdx]?.row.current?.name}
                </span>
                <span className="text-stone-500 tabular-nums">{Math.round(((currentIdx + 1) / updateRows.length) * 100)}%</span>
              </div>
              <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 transition-[width]" style={{ width: `${((currentIdx + 1) / updateRows.length) * 100}%` }} />
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Berhasil" value={successCount} color="blue" />
              <StatCard label="Gagal" value={errorCount} color="red" />
              <StatCard label="Waktu" value={`${elapsed}s`} color="stone" />
            </div>
          )}

          <div className="bg-white border border-stone-100 rounded-2xl overflow-hidden">
            <div className="max-h-[500px] overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-stone-50 border-b border-stone-100 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-stone-500">SKU</th>
                    <th className="text-left px-3 py-2 font-semibold text-stone-500">Nama</th>
                    <th className="text-left px-3 py-2 font-semibold text-stone-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {updateRows.map((r, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 font-mono text-stone-700">{r.row.data.sku}</td>
                      <td className="px-3 py-2 text-stone-700">{r.row.current?.name}</td>
                      <td className="px-3 py-2">
                        {r.status === 'pending'    && <span className="text-stone-400">Antri...</span>}
                        {r.status === 'optimizing' && <span className="text-amber-600 inline-flex items-center gap-1"><Loader2 size={11} className="animate-spin" /> Mengompres media...</span>}
                        {r.status === 'uploading'  && <span className="text-stone-700 inline-flex items-center gap-1"><Loader2 size={11} className="animate-spin" /> Mengupload...</span>}
                        {r.status === 'success'    && <span className="text-blue-600 inline-flex items-center gap-1"><CheckCircle2 size={11} /> Berhasil di-update</span>}
                        {r.status === 'error'      && <span className="text-red-600">{r.error}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {step === 'done' && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/admin/products')}
                className="inline-flex items-center gap-2 bg-stone-800 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-700 transition-colors"
              >
                Selesai → Lihat daftar produk
              </button>
              <button
                onClick={() => {
                  setStep('upload'); setPreview(null); setXlsxFile(null); setMediaFiles([]);
                  setUpdateRows([]); setCurrentIdx(0); setStartedAt(null);
                }}
                className="text-sm text-stone-500 hover:text-stone-700"
              >
                Update batch lagi
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: 'stone' | 'blue' | 'red' }) {
  const colors = {
    stone: 'bg-stone-100 text-stone-800',
    blue: 'bg-blue-100 text-blue-800',
    red: 'bg-red-100 text-red-800',
  };
  return (
    <div className={`${colors[color]} rounded-2xl p-4`}>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs font-medium opacity-80 mt-0.5">{label}</div>
    </div>
  );
}
