'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import WallpaperForm from '@/components/admin/WallpaperForm';

export default function EditWallpaperPage() {
  const params = useParams();
  const [wallpaper, setWallpaper] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/admin/wallpapers/${params.id}`)
      .then(r => setWallpaper(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
      </div>
    );
  }

  if (!wallpaper) {
    return <div className="p-8 text-stone-500">Wallpaper tidak ditemukan.</div>;
  }

  return <WallpaperForm mode="edit" initialData={wallpaper} />;
}
