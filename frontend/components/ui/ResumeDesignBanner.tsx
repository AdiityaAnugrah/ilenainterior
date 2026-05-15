'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Sofa, X } from 'lucide-react';
import { useEditorStore } from '@/store/editorStore';

interface SavedState {
  roomConfig: { width: number; depth: number; roomType: string };
  items: unknown[];
  currentStep: number;
  projectName: string;
}

export default function ResumeDesignBanner() {
  const [saved, setSaved] = useState<SavedState | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const reset = useEditorStore((s) => s.reset);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('ilena-editor');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const state: SavedState = parsed.state ?? parsed;
      // Only show if user has actually done something
      if (state.items?.length > 0 || state.currentStep > 1) {
        setSaved(state);
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const handleDiscard = () => {
    reset();
    localStorage.removeItem('ilena-editor');
    setDismissed(true);
  };

  if (!saved || dismissed) return null;

  const { roomConfig, items, projectName } = saved;
  const roomType = roomConfig?.roomType?.replace(/_/g, ' ') ?? 'ruang tamu';

  return (
    <div className="max-w-4xl mx-auto px-6 mb-6">
      <div className="bg-white border border-stone-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
        <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <Sofa size={18} className="text-stone-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-stone-800 truncate">
            {projectName && projectName !== 'Proyek Baru' ? projectName : 'Desain yang belum selesai'}
          </p>
          <p className="text-xs text-stone-500 mt-0.5">
            {roomConfig?.width ?? '?'} × {roomConfig?.depth ?? '?'} m · {roomType} · {(items?.length ?? 0)} furniture
          </p>
        </div>
        <Link
          href="/planner"
          className="flex items-center gap-1.5 bg-stone-800 text-white text-xs font-medium px-4 py-2 rounded-xl hover:bg-stone-700 transition-colors whitespace-nowrap"
        >
          Lanjutkan <ArrowRight size={13} />
        </Link>
        <button
          onClick={handleDiscard}
          title="Buang desain ini"
          className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
