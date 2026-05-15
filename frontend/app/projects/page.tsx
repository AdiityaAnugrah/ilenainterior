'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useEditorStore, PlacedItem, RoomConfig } from '@/store/editorStore';
import { formatPrice } from '@/lib/utils';
import { FolderOpen, Trash2, Plus, ArrowLeft, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

interface Project {
  id: number;
  name: string;
  room_type: string;
  room_config: RoomConfig & { items?: PlacedItem[] };
  item_count: number;
  updated_at: string;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  <  1) return 'Baru saja';
  if (mins  < 60) return `${mins} menit lalu`;
  if (hours < 24) return `${hours} jam lalu`;
  return `${days} hari lalu`;
}

export default function ProjectsPage() {
  const router  = useRouter();
  const { user, fetchMe } = useAuthStore();
  const { loadProject }   = useEditorStore();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    fetchMe().then(() => {
      if (!useAuthStore.getState().user) router.replace('/login');
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    api.get('/projects')
      .then(({ data }) => setProjects(data))
      .catch(() => toast.error('Gagal memuat proyek'))
      .finally(() => setLoading(false));
  }, [user]);

  const handleOpen = async (id: number) => {
    try {
      const { data } = await api.get(`/projects/${id}`);
      const config: Partial<RoomConfig> = data.room_config ?? {};
      const items: PlacedItem[] = (data.items ?? []).map((i: any) => ({
        id:          i.id?.toString() ?? crypto.randomUUID(),
        productId:   i.productId   ?? i.product_id,
        variantId:   i.variantId   ?? i.variant_id,
        name:        i.name        ?? '',
        thumbnail:   i.thumbnail   ?? '',
        model3d:     i.model3d     ?? i.model_3d ?? null,
        price:       Number(i.price) || 0,
        category:    i.category    ?? '',
        dimensions:  i.dimensions  ?? { width: 100, depth: 80, height: 80 },
        position:    i.position    ?? { x: 0, y: 0 },
        elevation:   i.elevation   ?? 0,
        rotation:    i.rotation    ?? 0,
        scale:       i.scale       ?? 1,
        variantColor: i.variantColor ?? i.variant_color,
      }));
      loadProject(id, data.name, config, items);
      router.push('/planner');
    } catch {
      toast.error('Gagal membuka proyek');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Hapus proyek "${name}"?`)) return;
    try {
      await api.delete(`/projects/${id}`);
      setProjects((p) => p.filter((x) => x.id !== id));
      toast.success('Proyek dihapus');
    } catch {
      toast.error('Gagal menghapus proyek');
    }
  };

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-stone-100">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="font-display text-lg font-semibold text-stone-900 tracking-wide">
            ILENA INTERIOR
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 transition-colors">
            <ArrowLeft size={14} /> Beranda
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-stone-900">Proyek Saya</h1>
            <p className="text-stone-500 text-sm mt-0.5">{projects.length} proyek tersimpan</p>
          </div>
          <Link
            href="/planner"
            className="flex items-center gap-2 bg-stone-800 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-700 transition-colors"
          >
            <Plus size={15} /> Proyek Baru
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-stone-100 p-5 animate-pulse">
                <div className="h-4 bg-stone-100 rounded w-3/4 mb-3" />
                <div className="h-3 bg-stone-100 rounded w-1/2 mb-6" />
                <div className="h-8 bg-stone-100 rounded" />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-100 py-20 flex flex-col items-center justify-center text-center">
            <FolderOpen size={40} className="text-stone-200 mb-4" />
            <p className="text-stone-500 font-medium">Belum ada proyek tersimpan</p>
            <p className="text-stone-400 text-sm mt-1 mb-6">Mulai desain ruangan dan simpan proyekmu</p>
            <Link
              href="/planner"
              className="bg-stone-800 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-700 transition-colors"
            >
              Mulai Desain
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-stone-100 hover:border-stone-200 hover:shadow-sm transition-all p-5 flex flex-col gap-3"
              >
                {/* Icon + name */}
                <div className="flex items-start justify-between gap-2">
                  <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center flex-shrink-0">
                    <FolderOpen size={18} className="text-stone-400" />
                  </div>
                  <button
                    onClick={() => handleDelete(p.id, p.name)}
                    className="p-1.5 text-stone-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all"
                    title="Hapus"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="flex-1">
                  <p className="font-semibold text-stone-800 truncate">{p.name}</p>
                  <p className="text-xs text-stone-400 capitalize mt-0.5">
                    {p.room_type?.replace('_', ' ')} · {p.item_count} furniture
                  </p>
                  {p.room_config?.width && (
                    <p className="text-xs text-stone-400 mt-0.5">
                      {p.room_config.width} × {p.room_config.depth} × {p.room_config.height} m
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-[11px] text-stone-400">
                    <Clock size={11} /> {timeAgo(p.updated_at)}
                  </span>
                </div>

                <button
                  onClick={() => handleOpen(p.id)}
                  className="w-full bg-stone-800 text-white text-sm font-medium py-2 rounded-xl hover:bg-stone-700 transition-colors"
                >
                  Buka Proyek
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
