'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Upload, Box, X, Plus, Trash2, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import api from '@/lib/api';
import { cn, formatPrice } from '@/lib/utils';
import toast from 'react-hot-toast';
import { optimizeGlb, optimizeImage, fmt, type OptimizeStats } from '@/lib/optimizeAssets';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:5000';

const CATEGORIES = ['sofa','meja','kursi','rak','lampu','dekorasi','kasur','lemari','aksesori','lainnya'];

interface Variant { id?: number; name: string; color: string; stock: number; model_3d?: string | null; }

interface ProductFormProps {
  initialData?: {
    id?: number; sku?: string; name?: string; category?: string;
    description?: string; price?: number;
    dimensions?: { width: number; depth: number; height: number };
    thumbnail?: string | null; model_3d?: string | null;
    tags?: string[]; stock?: number; is_active?: number;
    variants?: Variant[];
  };
  mode: 'new' | 'edit';
}

function DropZone({
  label, hint, accept, file, existingUrl, onFile, icon: Icon,
  busy, busyStage, stats,
}: {
  label: string; hint: string; accept: string;
  file: File | null; existingUrl?: string | null;
  onFile: (f: File | null) => void;
  icon: React.FC<{ size?: number; className?: string; strokeWidth?: number }>;
  busy?: boolean;
  busyStage?: string;
  stats?: OptimizeStats | null;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const previewSrc = file
    ? URL.createObjectURL(file)
    : existingUrl || null;

  const isImage = accept.includes('image');

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  }, [onFile]);

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-stone-700">{label}</label>
      <div
        onClick={() => !busy && ref.current?.click()}
        onDragOver={(e) => { e.preventDefault(); if (!busy) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { if (!busy) handleDrop(e); else e.preventDefault(); }}
        className={cn(
          'relative border-2 border-dashed rounded-xl transition-all overflow-hidden',
          busy ? 'cursor-wait opacity-80' : 'cursor-pointer',
          dragging ? 'border-stone-500 bg-stone-100' : 'border-stone-200 hover:border-stone-400 bg-stone-50',
          isImage ? 'aspect-square' : 'h-28'
        )}
      >
        {busy && (
          <div className="absolute inset-0 z-10 bg-white/85 backdrop-blur-sm flex flex-col items-center justify-center gap-2 p-3">
            <Loader2 size={22} className="text-stone-700 animate-spin" />
            <p className="text-xs text-stone-700 font-medium text-center">{busyStage || 'Mengoptimasi...'}</p>
          </div>
        )}
        {previewSrc && isImage ? (
          <>
            <Image 
              src={previewSrc} 
              alt="preview" 
              fill 
              className="object-cover" 
              sizes="300px"
              priority
              placeholder="blur"
              blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y1ZjVmNCIvPjwvc3ZnPg=="
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
              <p className="text-white text-xs font-medium">Klik untuk ganti</p>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-2 p-4">
            {previewSrc && !isImage ? (
              <>
                <Box size={24} className="text-blue-500" />
                <p className="text-xs text-blue-600 font-medium text-center">
                  {file ? file.name : 'Model 3D terpasang'}
                </p>
                <p className="text-[10px] text-stone-400">Klik untuk ganti</p>
              </>
            ) : (
              <>
                <Icon size={20} className="text-stone-400" strokeWidth={1.5} />
                <p className="text-xs text-stone-500 text-center font-medium">{hint}</p>
                <p className="text-[10px] text-stone-400">atau drag & drop di sini</p>
              </>
            )}
          </div>
        )}
        <input
          ref={ref}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />
      </div>
      {file && (
        <div className="flex items-center justify-between text-xs text-stone-500 bg-stone-100 rounded-lg px-3 py-1.5">
          <span className="truncate">{file.name} · {fmt(file.size)}</span>
          <button onClick={(e) => { e.stopPropagation(); onFile(null); }} className="text-stone-400 hover:text-red-500 ml-2 flex-shrink-0">
            <X size={12} />
          </button>
        </div>
      )}
      {stats && stats.reductionPct > 0 && (
        <div className="flex items-center gap-2 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5">
          <Sparkles size={11} className="flex-shrink-0" />
          <span className="leading-tight">
            <span className="line-through text-emerald-500/70">{fmt(stats.originalSize)}</span>
            {' → '}
            <span className="font-semibold">{fmt(stats.optimizedSize)}</span>
            {' '}
            <span className="text-emerald-600">(−{stats.reductionPct}%)</span>
          </span>
        </div>
      )}
    </div>
  );
}

export default function ProductForm({ initialData, mode }: ProductFormProps) {
  const router = useRouter();
  const d = initialData ?? {};

  const [form, setForm] = useState({
    sku:         d.sku         ?? '',
    name:        d.name        ?? '',
    category:    d.category    ?? 'sofa',
    description: d.description ?? '',
    price:       d.price       ?? 0,
    width:       d.dimensions?.width  ?? 0,
    depth:       d.dimensions?.depth  ?? 0,
    height:      d.dimensions?.height ?? 0,
    tags:        d.tags?.join(', ')   ?? '',
    stock:       d.stock       ?? 0,
    is_active:   d.is_active   ?? 1,
  });

  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [model3d,   setModel3d]   = useState<File | null>(null);
  const [variants,  setVariants]  = useState<Variant[]>(d.variants ?? []);
  const [loading,   setLoading]   = useState(false);

  const [thumbBusy,  setThumbBusy]  = useState(false);
  const [thumbStage, setThumbStage] = useState('');
  const [thumbStats, setThumbStats] = useState<OptimizeStats | null>(null);

  const [glbBusy,  setGlbBusy]  = useState(false);
  const [glbStage, setGlbStage] = useState('');
  const [glbStats, setGlbStats] = useState<OptimizeStats | null>(null);

  const [uploadPct, setUploadPct] = useState(0);

  // Unit toggle for dimension inputs — internal value always stored in cm
  const [dimUnit, setDimUnit] = useState<'cm' | 'mm'>('cm');
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('ilena_dim_unit');
    if (saved === 'mm' || saved === 'cm') setDimUnit(saved);
  }, []);
  const changeDimUnit = (u: 'cm' | 'mm') => {
    setDimUnit(u);
    if (typeof window !== 'undefined') localStorage.setItem('ilena_dim_unit', u);
  };
  const dispDim   = (cm: number) => dimUnit === 'mm' ? cm * 10 : cm;
  const parseDim  = (raw: string) => {
    const n = parseFloat(raw) || 0;
    return dimUnit === 'mm' ? n / 10 : n;  // always store as cm
  };

  const handleThumbnail = async (f: File | null) => {
    if (!f) {
      setThumbnail(null); setThumbStats(null); return;
    }
    setThumbBusy(true); setThumbStage('Mengompres foto...'); setThumbStats(null);
    try {
      const { blob, stats, filename } = await optimizeImage(f, { maxDimension: 2048, quality: 0.85 });
      const optimized = new File([blob], filename, { type: blob.type || 'image/webp' });
      setThumbnail(optimized);
      setThumbStats(stats);
    } catch (err) {
      console.error('Image optimize failed', err);
      setThumbnail(f);
      toast.error('Optimasi foto gagal — file asli akan dipakai');
    } finally {
      setThumbBusy(false); setThumbStage('');
    }
  };

  const handleModel = async (f: File | null) => {
    if (!f) {
      setModel3d(null); setGlbStats(null); return;
    }
    setGlbBusy(true); setGlbStage('Memulai...'); setGlbStats(null);
    try {
      const { blob, stats } = await optimizeGlb(f, {
        maxTextureSize: 2048,
        textureQuality: 0.85,
        onStage: setGlbStage,
      });
      const optimized = new File([blob], f.name, { type: 'model/gltf-binary' });
      setModel3d(optimized);
      setGlbStats(stats);
      if (stats.reductionPct > 0) {
        toast.success(`GLB dikompres ${stats.reductionPct}% (${fmt(stats.originalSize)} → ${fmt(stats.optimizedSize)})`);
      }
    } catch (err) {
      console.error('GLB optimize failed', err);
      setModel3d(f);
      toast.error('Optimasi GLB gagal — file asli akan diupload');
    } finally {
      setGlbBusy(false); setGlbStage('');
    }
  };

  const set = (k: keyof typeof form, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const addVariant = () => setVariants(v => [...v, { name: '', color: '#888888', stock: 0 }]);
  const removeVariant = (i: number) => setVariants(v => v.filter((_, j) => j !== i));
  const setVariant = (i: number, k: keyof Variant, v: string | number) =>
    setVariants(vs => vs.map((vr, j) => j === i ? { ...vr, [k]: v } : vr));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.sku || !form.name || !form.category || !form.price) {
      toast.error('SKU, nama, kategori, dan harga wajib diisi'); return;
    }
    if (!thumbnail && !d.thumbnail && mode === 'new') {
      toast.error('Foto produk wajib diupload'); return;
    }

    setLoading(true); setUploadPct(0);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
      if (thumbnail) fd.append('thumbnail', thumbnail);
      if (model3d)   fd.append('model_3d',  model3d);

      const uploadCfg = {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt: { loaded: number; total?: number }) => {
          if (evt.total) setUploadPct(Math.round((evt.loaded / evt.total) * 100));
        },
      };

      let productId = d.id;
      if (mode === 'new') {
        const { data } = await api.post('/api/admin/products', fd, uploadCfg);
        productId = data.id;
        toast.success('Produk berhasil ditambahkan!');
      } else {
        await api.put(`/api/admin/products/${d.id}`, fd, uploadCfg);
        toast.success('Produk berhasil diperbarui!');
      }

      // Simpan varian baru (yang belum punya id)
      for (const v of variants.filter(v => !v.id)) {
        if (!v.name) continue;
        const vfd = new FormData();
        vfd.append('name',  v.name);
        vfd.append('color', v.color);
        vfd.append('stock', String(v.stock));
        await api.post(`/api/admin/products/${productId}/variants`, vfd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      router.push('/admin/products');
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.message ?? 'Gagal menyimpan produk';
      toast.error(msg);
    } finally { setLoading(false); setUploadPct(0); }
  };

  const deleteVariant = async (v: Variant, i: number) => {
    if (v.id) {
      try {
        await api.delete(`/api/admin/products/${d.id}/variants/${v.id}`);
        toast.success('Varian dihapus');
      } catch { toast.error('Gagal hapus varian'); return; }
    }
    removeVariant(i);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-5xl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left — Upload */}
        <div className="lg:col-span-1 space-y-4">
          <DropZone
            label="Foto Produk *"
            hint="Upload foto utama produk (JPG / PNG / WebP)"
            accept="image/jpeg,image/png,image/webp"
            file={thumbnail}
            existingUrl={d.thumbnail}
            onFile={handleThumbnail}
            icon={Upload}
            busy={thumbBusy}
            busyStage={thumbStage}
            stats={thumbStats}
          />
          <DropZone
            label="Model 3D (.glb)"
            hint="Upload file .glb dari hasil scan atau modeling"
            accept=".glb"
            file={model3d}
            existingUrl={d.model_3d}
            onFile={handleModel}
            icon={Box}
            busy={glbBusy}
            busyStage={glbStage}
            stats={glbStats}
          />
          {/* Auto-optimize banner */}
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
            <p className="text-xs font-semibold text-emerald-800 mb-2 flex items-center gap-1.5">
              <Sparkles size={13} /> Auto-optimasi aktif
            </p>
            <ul className="text-xs text-emerald-700 space-y-1 list-disc pl-4">
              <li>Foto otomatis diresize max 2048px & dikonversi WebP.</li>
              <li>GLB otomatis dikompres (Meshopt + texture resize) — bisa turun 60–80%.</li>
              <li>Drop file mentahan dari Polycam/KIRI/Scaniverse langsung — biarkan browser yang mengoptimasi.</li>
            </ul>
          </div>

          {/* GLB scanning guide */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <p className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1.5">
              <Box size={13} /> Cara dapat file .glb
            </p>
            <ul className="text-xs text-blue-600 space-y-1">
              <li>📱 <strong>iPhone:</strong> Polycam atau Scaniverse</li>
              <li>🤖 <strong>Android:</strong> KIRI Engine atau Scaniverse</li>
              <li>💻 <strong>PC:</strong> Blender (gratis, modelling manual)</li>
            </ul>
            <p className="text-[10px] text-blue-400 mt-2">Scan produk → export .glb → drop di sini (max 50 MB).</p>
          </div>

          {/* Tips kalau masih kebesaran */}
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
            <p className="text-xs font-semibold text-amber-800 mb-2 flex items-center gap-1.5">
              <AlertCircle size={14} /> Kalau hasil akhir masih &gt;5 MB
            </p>
            <ul className="text-xs text-amber-700 space-y-2 list-disc pl-4">
              <li>Pre-process di <strong>gltf.report</strong> (aktifkan Draco) — bisa turun ~90%.</li>
              <li>Kurangi polygon di Blender (Modifier → Decimate, ratio 0.3–0.5).</li>
              <li>Satu file = satu produk. Jangan gabungkan banyak furnitur.</li>
            </ul>
          </div>
        </div>

        {/* Right — Detail */}
        <div className="lg:col-span-2 space-y-5">
          {/* Basic info */}
          <div className="bg-white rounded-2xl border border-stone-100 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-stone-700">Informasi Dasar</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input label="SKU *" value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="CTR-001" disabled={mode === 'edit'} />
              <div>
                <label className="text-sm font-medium text-stone-700 block mb-1">Kategori *</label>
                <select
                  value={form.category}
                  onChange={e => set('category', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:border-stone-400 focus:outline-none bg-white capitalize"
                >
                  {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
                </select>
              </div>
            </div>
            <Input label="Nama Produk *" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Sofa Modern 3-Seater" />
            <div>
              <label className="text-sm font-medium text-stone-700 block mb-1">Deskripsi</label>
              <textarea
                value={form.description}
                onChange={e => set('description', e.target.value)}
                rows={3}
                placeholder="Deskripsi singkat produk..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 focus:border-stone-400 focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Price & Stock */}
          <div className="bg-white rounded-2xl border border-stone-100 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-stone-700">Harga & Stok</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Harga (Rp) *" type="number" value={form.price} onChange={e => set('price', parseFloat(e.target.value) || 0)} placeholder="2500000" />
              <Input label="Stok" type="number" value={form.stock} onChange={e => set('stock', parseInt(e.target.value) || 0)} placeholder="10" />
            </div>
            {form.price > 0 && (
              <p className="text-xs text-stone-400">Preview: <span className="font-medium text-stone-600">{formatPrice(form.price)}</span></p>
            )}
            <div className="flex items-center gap-3">
              <input type="checkbox" id="is_active" checked={!!form.is_active}
                onChange={e => set('is_active', e.target.checked ? 1 : 0)}
                className="w-4 h-4 accent-stone-700" />
              <label htmlFor="is_active" className="text-sm text-stone-700">Produk aktif (tampil di katalog)</label>
            </div>
          </div>

          {/* Dimensions */}
          <div className="bg-white rounded-2xl border border-stone-100 p-5 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-stone-700">Dimensi Produk</h3>
                <span className="text-xs text-stone-400">(untuk penempatan di 3D)</span>
              </div>
              <div className="inline-flex rounded-lg border border-stone-200 overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => changeDimUnit('cm')}
                  className={`px-3 py-1.5 font-medium transition-colors ${dimUnit === 'cm' ? 'bg-stone-800 text-white' : 'bg-white text-stone-500 hover:bg-stone-50'}`}
                >
                  cm
                </button>
                <button
                  type="button"
                  onClick={() => changeDimUnit('mm')}
                  className={`px-3 py-1.5 font-medium transition-colors ${dimUnit === 'mm' ? 'bg-stone-800 text-white' : 'bg-white text-stone-500 hover:bg-stone-50'}`}
                >
                  mm
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Input label={`Lebar (${dimUnit})`}      type="number" unit={dimUnit} value={dispDim(form.width)}  onChange={e => set('width',  parseDim(e.target.value))} placeholder={dimUnit === 'mm' ? '1800' : '180'} />
              <Input label={`Kedalaman (${dimUnit})`} type="number" unit={dimUnit} value={dispDim(form.depth)}  onChange={e => set('depth',  parseDim(e.target.value))} placeholder={dimUnit === 'mm' ? '850'  : '85'} />
              <Input label={`Tinggi (${dimUnit})`}    type="number" unit={dimUnit} value={dispDim(form.height)} onChange={e => set('height', parseDim(e.target.value))} placeholder={dimUnit === 'mm' ? '800'  : '80'} />
            </div>
            {(form.width > 0 || form.depth > 0) && (
              <div className="bg-stone-50 rounded-lg px-3 py-2 text-xs text-stone-500">
                Luas lantai: <span className="font-medium">{((form.width/100) * (form.depth/100)).toFixed(2)} m²</span>
                {' · '}Volume: <span className="font-medium">{((form.width/100) * (form.depth/100) * (form.height/100)).toFixed(2)} m³</span>
                {dimUnit === 'mm' && (
                  <span className="ml-2 text-stone-400">(data tersimpan dalam cm: {form.width} × {form.depth} × {form.height})</span>
                )}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="bg-white rounded-2xl border border-stone-100 p-5">
            <Input
              label="Tags (pisah dengan koma)"
              value={form.tags}
              onChange={e => set('tags', e.target.value)}
              placeholder="modern, minimalis, kayu"
            />
          </div>

          {/* Variants */}
          <div className="bg-white rounded-2xl border border-stone-100 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-stone-700">Varian Warna</h3>
              <button type="button" onClick={addVariant}
                className="flex items-center gap-1.5 text-xs text-stone-600 border border-stone-200 px-3 py-1.5 rounded-lg hover:bg-stone-50 transition-colors">
                <Plus size={13} /> Tambah Varian
              </button>
            </div>
            {variants.length === 0 && (
              <p className="text-xs text-stone-400 text-center py-4">Belum ada varian. Klik "Tambah Varian" untuk menambahkan pilihan warna.</p>
            )}
            {variants.map((v, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
                <input
                  type="color"
                  value={v.color || '#888888'}
                  onChange={e => setVariant(i, 'color', e.target.value)}
                  className="w-9 h-9 rounded-lg border border-stone-200 cursor-pointer flex-shrink-0"
                />
                <input
                  value={v.name}
                  onChange={e => setVariant(i, 'name', e.target.value)}
                  placeholder="Nama warna (misal: Abu-abu)"
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-stone-200 focus:border-stone-400 focus:outline-none bg-white"
                />
                <input
                  type="number"
                  value={v.stock}
                  onChange={e => setVariant(i, 'stock', parseInt(e.target.value) || 0)}
                  placeholder="Stok"
                  className="w-20 px-3 py-2 text-sm rounded-lg border border-stone-200 focus:border-stone-400 focus:outline-none bg-white"
                />
                <button type="button" onClick={() => deleteVariant(v, i)}
                  className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>

          {/* Upload progress */}
          {loading && uploadPct > 0 && (
            <div className="bg-white rounded-2xl border border-stone-100 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-600 font-medium">Mengupload ke server...</span>
                <span className="text-stone-500 tabular-nums">{uploadPct}%</span>
              </div>
              <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-stone-700 transition-[width] duration-150"
                  style={{ width: `${uploadPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              loading={loading}
              size="lg"
              disabled={loading || thumbBusy || glbBusy}
            >
              {mode === 'new' ? 'Simpan Produk' : 'Perbarui Produk'}
            </Button>
            <Button type="button" variant="outline" size="lg" onClick={() => router.push('/admin/products')}>
              Batal
            </Button>
            {(thumbBusy || glbBusy) && (
              <span className="text-xs text-stone-500 flex items-center gap-1.5">
                <Loader2 size={12} className="animate-spin" /> Tunggu optimasi selesai...
              </span>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
