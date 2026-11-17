'use client';
import { useEffect, useRef, useState } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export function useAutoSave() {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const pendingSavesRef = useRef(0);
  const { items, roomConfig, projectId, projectName, setProjectId, projectRevision, setProjectRevision } = useEditorStore();
  const { token } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const buildPayload = (state: ReturnType<typeof useEditorStore.getState>) => ({
    name: state.projectName,
    room_type: state.roomConfig.roomType,
    room_config: {
      ...state.roomConfig,
      items: state.items.map((i) => ({
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
  });

  const save = (silent = false): Promise<boolean> => {
    pendingSavesRef.current += 1;
    setIsSaving(true);
    const operation = saveQueueRef.current.then(async () => {
      // Read the latest state only when this serialized operation starts.
      const state = useEditorStore.getState();
      const payload = buildPayload(state);

      try {
        if (state.projectId) {
          const { data } = await api.put(`/api/projects/${state.projectId}`, {
            ...payload,
            ...(state.projectRevision ? { expected_revision: state.projectRevision } : {}),
          });
          if (data.revision) state.setProjectRevision(data.revision);
        } else {
          const { data } = await api.post('/api/projects', payload);
          state.setProjectId(data.id);
          if (data.revision) state.setProjectRevision(data.revision);
          console.log('[Auto-Save] Project created with ID:', data.id);
        }

        const stillCurrent = JSON.stringify(payload) === JSON.stringify(buildPayload(useEditorStore.getState()));
        setSaveError(false);
        setSaveErrorMessage(null);
        setHasUnsavedChanges(!stillCurrent);
        if (stillCurrent) setLastSaved(new Date());
        if (!silent) {
          if (stillCurrent) toast.success('Proyek disimpan', { id: 'save' });
          else toast.error('Perubahan terbaru belum tersimpan', { id: 'save' });
        }
        return stillCurrent;
      } catch (error) {
        console.error('[Auto-Save Error]', error);
        const status = (error as { response?: { status?: number } })?.response?.status;
        const message = status === 409 || status === 428
          ? 'Versi proyek berubah. Buka ulang proyek sebelum menyimpan.'
          : 'Gagal menyimpan proyek';
        setSaveError(true);
        setSaveErrorMessage(message);
        setHasUnsavedChanges(true);
        if (!silent) toast.error(message);
        return false;
      }
    });

    saveQueueRef.current = operation.then(() => undefined, () => undefined);
    return operation.finally(() => {
      pendingSavesRef.current -= 1;
      if (pendingSavesRef.current === 0) setIsSaving(false);
    });
  };

  // Auto-save debounced 10 detik setiap ada perubahan
  // Works for both authenticated and guest users
  // Increased from 3s to 10s to reduce lag during 3D interaction
  useEffect(() => {
    setHasUnsavedChanges(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => save(true), 10000);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [items, projectName, roomConfig]);

  return { save, isSaving, lastSaved, saveError, saveErrorMessage, hasUnsavedChanges };
}
