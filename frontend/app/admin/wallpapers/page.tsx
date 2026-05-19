'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { Plus, Search, Pencil, Trash2, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import Pagination from '@/components/admin/Pagination';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:5000';

const CATEGORY_LABELS: Record<string, string> = {
  polos: 'Polos', motif: 'Motif', tekstur: 'Tekstur', premium: 'Premium',
};

interface Wallpaper {
  id: number; name: string; category: string;
  price_per_meter: number; thumbnail: string | null;
  texture_pattern: string; color: string;
  is_active: number; description: string;
}

export default function AdminWallpapersPage() {
  const [wallpapers, setWallpapers] = useState<Wallpaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 30;

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/admin/wallpapers', { params: { search, page, limit } });
      setWallpapers(data.data);
      setTotal(data.total);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [search, page]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Hapus wallpaper "${name}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    try {
      await api.delete(`/api/admin/wallpapers/${id}`);
      toast.success('Wallpaper dihapus');
      load();
    } catch { toast.error('Gagal menghapus wallpaper'); }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Wallpaper</h1>
          <p className="text-stone-500 text-sm mt-1">{total} wallpaper total</p>
        </div>
        <Link
          href="/admin/wallpapers/new"
          className="flex items-center gap-2 bg-stone-800 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-700 transition-colors"
        >
          <Plus size={16} /> Tambah Wallpaper
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari wallpaper..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-stone-400 bg-white"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-stone-100">
            <tr>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-stone-500 uppercase tracking-wide">Wallpaper</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-stone-500 uppercase tracking-wide">Kategori</th>
              <th className="text-right px-4 py-3.5 text-xs font-semibold text-stone-500 uppercase tracking-wide">Harga/m</th>
              <th className="text-center px-4 py-3.5 text-xs font-semibold text-stone-500 uppercase tracking-wide">Warna</th>
              <th className="text-center px-4 py-3.5 text-xs font-semibold text-stone-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-5 py-4"><div className="h-4 bg-stone-100 rounded animate-pulse w-40" /></td>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <td key={j} className="px-4 py-4"><div className="h-4 bg-stone-100 rounded animate-pulse w-16 mx-auto" /></td>
                  ))}
                  <td />
                </tr>
              ))
            ) : wallpapers.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-16 text-stone-400">
                  <ImageIcon size={32} className="mx-auto mb-2 opacity-30" />
                  <p>Belum ada wallpaper. <Link href="/admin/wallpapers/new" className="text-stone-600 underline">Tambah sekarang</Link></p>
                </td>
              </tr>
            ) : wallpapers.map((wp) => (
              <tr key={wp.id} className="hover:bg-stone-50/50 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0">
                      {wp.thumbnail ? (
                        <Image 
                          src={wp.thumbnail} 
                          alt={wp.name} 
                          fill 
                          className="object-cover" 
                          sizes="40px"
                          loading="lazy"
                          placeholder="blur"
                          blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjZjVmNWY0Ii8+PC9zdmc+"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: wp.color }}>
                          <span className="text-white/40 text-xs">🖼️</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-stone-800">{wp.name}</p>
                      <p className="text-xs text-stone-400">{wp.texture_pattern}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 capitalize text-stone-600">{CATEGORY_LABELS[wp.category] || wp.category}</td>
                <td className="px-4 py-4 text-right font-medium text-stone-800">{formatPrice(wp.price_per_meter)}</td>
                <td className="px-4 py-4 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <div className="w-5 h-5 rounded border border-stone-200" style={{ backgroundColor: wp.color }} />
                    <span className="text-xs text-stone-500 font-mono">{wp.color}</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-center">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${wp.is_active ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'}`}>
                    {wp.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2 justify-end">
                    <Link
                      href={`/admin/wallpapers/${wp.id}`}
                      className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-all"
                      title="Edit"
                    >
                      <Pencil size={15} />
                    </Link>
                    <button
                      onClick={() => handleDelete(wp.id, wp.name)}
                      className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      title="Hapus"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination
          page={page}
          total={total}
          limit={limit}
          onChange={setPage}
          itemLabel="wallpaper"
        />
      </div>
    </div>
  );
}
