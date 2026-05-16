'use client';
import { useEffect, useRef, useState } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export function useAutoSave() {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { items, roomConfig, projectId, projectName, setProjectId } = useEditorStore();
  const { token } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const save = async (silent = false) => {
    // Allow save for both authenticated and guest users
    setIsSaving(true);
    try {
      const payload = {
        name: projectName,
        room_type: roomConfig.roomType,
        room_config: {
          ...roomConfig,
          items: items.map((i) => ({
            id:          i.id,
            productId:   i.productId,
            variantId:   i.variantId,
            name:        i.name,
            thumbnail:   i.thumbnail,
            model3d:     i.model3d,
            price:       i.price,
            category:    i.category,
            dimensions:  i.dimensions,
            position:    i.position,
            elevation:   i.elevation ?? 0,
            rotation:    i.rotation,
            scale:       i.scale,
            variantColor: i.variantColor,
          })),
        },
      };

      if (projectId) {
        await api.put(`/api/projects/${projectId}`, payload);
      } else {
        const { data } = await api.post('/api/projects', payload);
        setProjectId(data.id);
        console.log('[Auto-Save] Project created with ID:', data.id);
      }

      setLastSaved(new Date());
      if (!silent) toast.success('Proyek disimpan', { id: 'save' });
    } catch (error) {
      console.error('[Auto-Save Error]', error);
      if (!silent) toast.error('Gagal menyimpan proyek');
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save debounced 10 detik setiap ada perubahan
  // Works for both authenticated and guest users
  // Increased from 3s to 10s to reduce lag during 3D interaction
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => save(true), 10000);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [items, roomConfig]);

  return { save, isSaving, lastSaved };
}
