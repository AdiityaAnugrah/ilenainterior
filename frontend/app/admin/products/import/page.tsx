'use client';
import { useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Upload, FileSpreadsheet, Download, AlertCircle,
  CheckCircle2, X, Loader2, Sparkles, Image as ImageIcon, Box, PlayCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { optimizeGlb, optimizeImage, fmt } from '@/lib/optimizeAssets';

interface PreviewRow {
  row: number;
  data: {
    sku?: string; name?: string; category?: string;
    price?: number; stock?: number; width?: number; depth?: number; height?: number;
    description?: string; tags?: string; is_active?: number;
  };
  errors: string[];
}

interface PreviewResponse {
  totalRows: number;
  okCount: number;
  errCount: number;
  rows: PreviewRow[];
}

interface ImportRowState {
  row: PreviewRow;
  thumbnailFile?: File;
  modelFile?: File;
  status: 'pending' | 'optimizing' | 'uploading' | 'success' | 'error' | 'skipped';
  error?: string;
}

type Step = 'upload' | 'preview' | 'importing' | 'done';

const ACCEPT_IMG = ['.jpg', '.jpeg', '.png', '.webp'];
const ACCEPT_GLB = ['.glb'];

function baseName(filename: string): string {
  return filename.replace(/\.[^.]+$/, '').toLowerCase();
}

function ext(filename: string): string {
  const m = filename.toLowerCase().match(/\.[^.]+$/);
  return m ? m[0] : '';
}

export default function ProductsImportPage() {
  const router = useRouter();
  const xlsxRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('upload');
  const [xlsxFile, setXlsxFile] = useState<File | null>(null);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [importRows, setImportRows] = useState<ImportRowState[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [importStartedAt, setImportStartedAt] = useState<number | null>(null);

  // Index media by base name (lowercased, no ext) → File
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
      const res = await api.get('/api/admin/products/import/template', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template_produk_ilena.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Gagal download template');
    }
  };

  const handleXlsxPick = (f: File | null) => {
    if (!f) { setXlsxFile(null); setPreview(null); return; }
    if (!/\.xlsx$/i.test(f.name)) { toast.error('File harus .xlsx'); return; }
    setXlsxFile(f);
    setPreview(null);
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
      const { data } = await api.post<PreviewResponse>('/api/admin/products/import/preview', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreview(data);
      setStep('preview');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal memproses file');
    } finally { setPreviewing(false); }
  };

  const startImport = async () => {
    if (!preview) return;
    const validRows = preview.rows.filter(r => r.errors.length === 0);
    if (validRows.length === 0) { toast.error('Tidak ada baris valid untuk di-import'); return; }

    const initial: ImportRowState[] = validRows.map(row => {
      const base = baseName(row.data.sku || '');
      const slot = mediaIndex.get(base);
      return {
        row,
        thumbnailFile: slot?.thumb,
        modelFile: slot?.model,
        status: 'pending',
      };
    });

    setImportRows(initial);
    setCurrentIdx(0);
    setStep('importing');
    setImportStartedAt(Date.now());

    // Process sequentially
    for (let i = 0; i < initial.length; i++) {
      setCurrentIdx(i);
      const item = initial[i];

      const updateItem = (patch: Partial<ImportRowState>) => {
        setImportRows(prev => {
          const next = [...prev];
          next[i] = { ...next[i], ...patch };
          return next;
        });
        Object.assign(item, patch); // keep local in sync
      };

      try {
        // Optimize media
        updateItem({ status: 'optimizing' });

        let thumb = item.thumbnailFile;
        let model = item.modelFile;

        if (thumb) {
          try {
            const { blob, filename } = await optimizeImage(thumb, { maxDimension: 2048, quality: 0.85 });
            thumb = new File([blob], filename, { type: blob.type || 'image/webp' });
          } catch {
            /* keep original */
          }
        }
        if (model) {
          try {
            const { blob } = await optimizeGlb(model, { maxTextureSize: 2048, textureQuality: 0.85 });
            model = new File([blob], model.name, { type: 'model/gltf-binary' });
          } catch {
            /* keep original */
          }
        }

        updateItem({ status: 'uploading' });

        const d = item.row.data;
        const fd = new FormData();
        fd.append('sku',         String(d.sku ?? ''));
        fd.append('name',        String(d.name ?? ''));
        fd.append('category',    String(d.category ?? ''));
        fd.append('description', String(d.description ?? ''));
        fd.append('price',       String(d.price ?? 0));
        fd.append('width',       String(d.width ?? 0));
        fd.append('depth',       String(d.depth ?? 0));
        fd.append('height',      String(d.height ?? 0));
        fd.append('tags',        String(d.tags ?? ''));
        fd.append('stock',       String(d.stock ?? 0));
        fd.append('is_active',   String(d.is_active ?? 1));
        if (thumb) fd.append('thumbnail', thumb);
        if (model) fd.append('model_3d',  model);

        await api.post('/api/admin/products', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        updateItem({ status: 'success' });
      } catch (err: any) {
        const msg = err?.response?.data?.message || err?.message || 'Upload gagal';
        updateItem({ status: 'error', error: msg });
      }
    }

    setStep('done');
  };

  const successCount = importRows.filter(r => r.status === 'success').length;
  const errorCount = importRows.filter(r => r.status === 'error').length;
  const elapsed = importStartedAt ? Math.round((Date.now() - importStartedAt) / 1000) : 0;

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="p-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/products" className="p-2 rounded-lg hover:bg-stone-100 text-stone-500 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Import Banyak Produk</h1>
          <p className="text-stone-500 text-sm mt-0.5">Upload Excel + folder foto/GLB untuk import puluhan produk sekaligus</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8">
        {[
          { id: 'upload', label: '1. Upload File' },
          { id: 'preview', label: '2. Preview & Validasi' },
          { id: 'importing', label: '3. Import' },
        ].map((s, i, arr) => {
          const stepOrder = ['upload', 'preview', 'importing', 'done'];
          const cur = stepOrder.indexOf(step);
          const me = stepOrder.indexOf(s.id);
          const done = cur > me;
          const active = cur === me || (s.id === 'importing' && step === 'done');
          return (
            <div key={s.id} className="flex items-center gap-2">
              <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${active ? 'bg-stone-800 text-white' : done ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-400'}`}>
                {s.label}
              </div>
              {i < arr.length - 1 && <div className={`w-8 h-px ${done ? 'bg-emerald-400' : 'bg-stone-200'}`} />}
            </div>
          );
        })}
      </div>

      {/* STEP 1: UPLOAD */}
      {step === 'upload' && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <FileSpreadsheet size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-blue-900 mb-1">Belum punya template?</h3>
                <p className="text-xs text-blue-700 mb-3">Download template Excel resmi dengan kolom yang sudah benar + dropdown kategori + contoh data.</p>
                <button onClick={handleDownloadTemplate} className="inline-flex items-center gap-2 bg-blue-600 text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  <Download size={13} /> Download template_produk_ilena.xlsx
                </button>
              </div>
            </div>
          </div>

          {/* Xlsx dropzone */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">File Excel *</label>
            <div
              onClick={() => xlsxRef.current?.click()}
              className="border-2 border-dashed border-stone-200 hover:border-stone-400 rounded-2xl p-6 cursor-pointer transition-colors bg-stone-50"
            >
              {xlsxFile ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet size={22} className="text-emerald-600" />
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
                  <p className="text-xs text-stone-400">Berisi data produk yang mau di-import</p>
                </div>
              )}
              <input ref={xlsxRef} type="file" accept=".xlsx" className="hidden" onChange={(e) => handleXlsxPick(e.target.files?.[0] || null)} />
            </div>
          </div>

          {/* Media multi-upload */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              File Foto & GLB (opsional)
              <span className="ml-2 text-xs text-stone-400 font-normal">Nama file harus sama dengan SKU. Contoh: SOF-001.jpg, SOF-001.glb</span>
            </label>
            <div
              onClick={() => mediaRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); }}
              onDrop={(e) => { e.preventDefault(); handleMediaPick(e.dataTransfer.files); }}
              className="border-2 border-dashed border-stone-200 hover:border-stone-400 rounded-2xl p-6 cursor-pointer transition-colors bg-stone-50"
            >
              <div className="flex flex-col items-center gap-2 py-4">
                <div className="flex items-center gap-2 text-stone-400">
                  <ImageIcon size={20} /><Box size={20} />
                </div>
                <p className="text-sm font-medium text-stone-600">
                  {mediaFiles.length > 0 ? `${mediaFiles.length} file dipilih` : 'Klik atau drop banyak file foto/GLB sekaligus'}
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

          {/* Action */}
          <div className="flex items-center gap-3">
            <button
              onClick={handlePreview}
              disabled={!xlsxFile || previewing}
              className="inline-flex items-center gap-2 bg-stone-800 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {previewing ? <Loader2 size={15} className="animate-spin" /> : <PlayCircle size={15} />}
              {previewing ? 'Memvalidasi...' : 'Preview & Validasi'}
            </button>
            <Link href="/admin/products" className="text-sm text-stone-500 hover:text-stone-700">Batal</Link>
          </div>
        </div>
      )}

      {/* STEP 2: PREVIEW */}
      {step === 'preview' && preview && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Total Baris" value={preview.totalRows} color="stone" />
            <StatCard label="Siap Import" value={preview.okCount} color="emerald" />
            <StatCard label="Error" value={preview.errCount} color="red" />
          </div>

          {preview.errCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <span>Baris yang error akan di-skip saat import. Fix di file Excel dan re-upload kalau mau ikut import.</span>
            </div>
          )}

          <div className="bg-white border border-stone-100 rounded-2xl overflow-hidden">
            <div className="max-h-[500px] overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-stone-50 border-b border-stone-100 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold text-stone-500">Baris</th>
                    <th className="text-left px-3 py-2 font-semibold text-stone-500">SKU</th>
                    <th className="text-left px-3 py-2 font-semibold text-stone-500">Nama</th>
                    <th className="text-left px-3 py-2 font-semibold text-stone-500">Kategori</th>
                    <th className="text-right px-3 py-2 font-semibold text-stone-500">Harga</th>
                    <th className="text-center px-3 py-2 font-semibold text-stone-500">Foto</th>
                    <th className="text-center px-3 py-2 font-semibold text-stone-500">GLB</th>
                    <th className="text-left px-3 py-2 font-semibold text-stone-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {preview.rows.map((r) => {
                    const base = baseName(r.data.sku || '');
                    const slot = mediaIndex.get(base);
                    const hasErr = r.errors.length > 0;
                    return (
                      <tr key={r.row} className={hasErr ? 'bg-red-50/40' : ''}>
                        <td className="px-3 py-2 text-stone-400">{r.row}</td>
                        <td className="px-3 py-2 font-mono text-stone-700">{r.data.sku || '—'}</td>
                        <td className="px-3 py-2 text-stone-700">{r.data.name || '—'}</td>
                        <td className="px-3 py-2 capitalize text-stone-600">{r.data.category || '—'}</td>
                        <td className="px-3 py-2 text-right text-stone-700">{r.data.price ? `Rp ${r.data.price.toLocaleString('id-ID')}` : '—'}</td>
                        <td className="px-3 py-2 text-center">
                          {slot?.thumb ? <CheckCircle2 size={13} className="text-emerald-500 inline" /> : <span className="text-stone-300">—</span>}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {slot?.model ? <CheckCircle2 size={13} className="text-blue-500 inline" /> : <span className="text-stone-300">—</span>}
                        </td>
                        <td className="px-3 py-2">
                          {hasErr ? (
                            <span className="text-red-600 text-[11px]">{r.errors.join('; ')}</span>
                          ) : (
                            <span className="text-emerald-600 text-[11px] inline-flex items-center gap-1"><CheckCircle2 size={11} /> OK</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={startImport}
              disabled={preview.okCount === 0}
              className="inline-flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Sparkles size={15} /> Import {preview.okCount} produk
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

      {/* STEP 3: IMPORTING / DONE */}
      {(step === 'importing' || step === 'done') && (
        <div className="space-y-5">
          {step === 'importing' && (
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2 text-sm">
                <span className="font-medium text-stone-700">
                  {currentIdx + 1} / {importRows.length} — {importRows[currentIdx]?.row.data.name}
                </span>
                <span className="text-stone-500 tabular-nums">{Math.round(((currentIdx + 1) / importRows.length) * 100)}%</span>
              </div>
              <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
                <div className="h-full bg-stone-700 transition-[width]" style={{ width: `${((currentIdx + 1) / importRows.length) * 100}%` }} />
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Berhasil" value={successCount} color="emerald" />
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
                  {importRows.map((r, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 font-mono text-stone-700">{r.row.data.sku}</td>
                      <td className="px-3 py-2 text-stone-700">{r.row.data.name}</td>
                      <td className="px-3 py-2">
                        {r.status === 'pending'    && <span className="text-stone-400">Antri...</span>}
                        {r.status === 'optimizing' && <span className="text-blue-600 inline-flex items-center gap-1"><Loader2 size={11} className="animate-spin" /> Mengompres media...</span>}
                        {r.status === 'uploading'  && <span className="text-stone-700 inline-flex items-center gap-1"><Loader2 size={11} className="animate-spin" /> Mengupload...</span>}
                        {r.status === 'success'    && <span className="text-emerald-600 inline-flex items-center gap-1"><CheckCircle2 size={11} /> Berhasil</span>}
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
                  setImportRows([]); setCurrentIdx(0); setImportStartedAt(null);
                }}
                className="text-sm text-stone-500 hover:text-stone-700"
              >
                Import batch lagi
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: 'stone' | 'emerald' | 'red' }) {
  const colors = {
    stone: 'bg-stone-100 text-stone-800',
    emerald: 'bg-emerald-100 text-emerald-800',
    red: 'bg-red-100 text-red-800',
  };
  return (
    <div className={`${colors[color]} rounded-2xl p-4`}>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs font-medium opacity-80 mt-0.5">{label}</div>
    </div>
  );
}
