'use client';
import { useState, useRef, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { ArrowLeft, Upload, Save, X } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

const CATEGORIES = [
  { value: 'polos', label: 'Polos' },
  { value: 'motif', label: 'Motif' },
  { value: 'tekstur', label: 'Tekstur' },
  { value: 'premium', label: 'Premium' },
];

const PATTERNS = [
  { value: 'plain', label: 'Polos' },
  { value: 'brick', label: 'Bata' },
  { value: 'stripes', label: 'Garis' },
  { value: 'geometric', label: 'Geometris' },
  { value: 'concrete', label: 'Beton' },
  { value: 'wood', label: 'Kayu' },
];

interface WallpaperFormProps {
  mode: 'new' | 'edit';
  initialData?: {
    id: number;
    name: string;
    category: string;
    price_per_meter: number;
    thumbnail: string | null;
    texture_pattern: string;
    color: string;
    description: string;
    is_active: number;
  };
}

export default function WallpaperForm({ mode, initialData }: WallpaperFormProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(initialData?.name ?? '');
  const [category, setCategory] = useState(initialData?.category ?? 'polos');
  const [pricePerMeter, setPricePerMeter] = useState(initialData?.price_per_meter?.toString() ?? '');
  const [texturePattern, setTexturePattern] = useState(initialData?.texture_pattern ?? 'plain');
  const [color, setColor] = useState(initialData?.color ?? '#FFFFFF');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [isActive, setIsActive] = useState(initialData?.is_active ?? 1);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(initialData?.thumbnail ?? null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  const handleThumbnail = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Nama wajib diisi'); return; }
    if (!pricePerMeter || parseFloat(pricePerMeter) <= 0) { toast.error('Harga per meter wajib diisi'); return; }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', name);
      fd.append('category', category);
      fd.append('price_per_meter', pricePerMeter);
      fd.append('texture_pattern', texturePattern);
      fd.append('color', color);
      fd.append('description', description);
      fd.append('is_active', String(isActive));
      if (thumbnailFile) fd.append('thumbnail', thumbnailFile);

      if (mode === 'edit' && initialData) {
        await api.put(`/admin/wallpapers/${initialData.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Wallpaper diperbarui');
      } else {
        await api.post('/admin/wallpapers', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Wallpaper ditambahkan');
      }
      router.push('/admin/wallpapers');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/wallpapers" className="p-2 rounded-lg hover:bg-stone-100 text-stone-500 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-stone-900">
            {mode === 'edit' ? 'Edit Wallpaper' : 'Tambah Wallpaper'}
          </h1>
          <p className="text-stone-500 text-sm mt-0.5">
            {mode === 'edit' ? 'Perbarui data wallpaper' : 'Tambah wallpaper baru'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Thumbnail */}
        <div>
          <label className="block text-xs font-semibold text-stone-600 mb-1.5">Gambar Thumbnail</label>
          <div className="flex items-center gap-4">
            <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-dashed border-stone-200 bg-stone-50">
              {thumbnailPreview ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumbnailPreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setThumbnailPreview(null); setThumbnailFile(null); }}
                    className="absolute top-1 right-1 p-0.5 bg-red-500 text-white rounded-full"
                  >
                    <X size={10} />
                  </button>
                </>
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center cursor-pointer"
                  onClick={() => fileRef.current?.click()}
                  style={{ backgroundColor: color }}
                >
                  <Upload size={16} className="text-white/50" />
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp" onChange={handleThumbnail} className="hidden" />
            <button type="button" onClick={() => fileRef.current?.click()} className="text-xs text-stone-500 hover:text-stone-700 underline">
              {thumbnailPreview ? 'Ganti gambar' : 'Upload gambar'}
            </button>
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block text-xs font-semibold text-stone-600 mb-1.5">Nama Wallpaper *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Contoh: Bata Ekspos Natural"
            className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-stone-400"
            required
          />
        </div>

        {/* Category & Pattern */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">Kategori</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-stone-400 bg-white"
            >
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">Pola Tekstur</label>
            <select
              value={texturePattern}
              onChange={e => setTexturePattern(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-stone-400 bg-white"
            >
              {PATTERNS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
        </div>

        {/* Price & Color */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">Harga per Meter (Rp) *</label>
            <input
              type="number"
              value={pricePerMeter}
              onChange={e => setPricePerMeter(e.target.value)}
              placeholder="50000"
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-stone-400"
              min="0"
              step="1000"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5">Warna Utama</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-stone-200 cursor-pointer"
              />
              <input
                type="text"
                value={color}
                onChange={e => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) setColor(e.target.value); }}
                className="flex-1 px-2 py-2.5 text-xs font-mono border border-stone-200 rounded-xl focus:outline-none focus:border-stone-400"
                maxLength={7}
              />
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-stone-600 mb-1.5">Deskripsi</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Deskripsi singkat wallpaper..."
            rows={3}
            className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-stone-400 resize-none"
          />
        </div>

        {/* Status */}
        {mode === 'edit' && (
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-stone-600">Status:</label>
            <button
              type="button"
              onClick={() => setIsActive(isActive ? 0 : 1)}
              className={`relative w-10 h-5 rounded-full transition-colors ${isActive ? 'bg-green-500' : 'bg-stone-300'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isActive ? 'left-5' : 'left-0.5'}`} />
            </button>
            <span className="text-xs text-stone-500">{isActive ? 'Aktif' : 'Nonaktif'}</span>
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-stone-800 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-700 transition-colors disabled:opacity-50"
          >
            <Save size={15} />
            {saving ? 'Menyimpan...' : (mode === 'edit' ? 'Simpan Perubahan' : 'Tambah Wallpaper')}
          </button>
          <Link
            href="/admin/wallpapers"
            className="px-5 py-2.5 rounded-xl text-sm font-medium border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
          >
            Batal
          </Link>
        </div>
      </form>
    </div>
  );
}
