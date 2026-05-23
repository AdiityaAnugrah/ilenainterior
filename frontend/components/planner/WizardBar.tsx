'use client';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useEditorStore } from '@/store/editorStore';
import { useAuthStore } from '@/store/authStore';
import { useAutoSave } from '@/hooks/useAutoSave';
import AutoSaveIndicator from './AutoSaveIndicator';
import Link from 'next/link';
import { Save, User, Check } from 'lucide-react';
import { preloadAllControls } from './three/LazyControls';

const STEPS = [
  { num: 1, label: 'Ruangan' },
  { num: 2, label: 'Material' },
  { num: 3, label: 'Furniture' },
  { num: 4, label: 'Hasil' },
];

export default function WizardBar() {
  const { currentStep, setCurrentStep, viewMode, setViewMode, projectName, setProjectName } = useEditorStore();
  const { user } = useAuthStore();
  const { save, isSaving, lastSaved } = useAutoSave();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editingName, setEditingName] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await save(false);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Preload Three.js controls when user hovers over 3D/Walk buttons
  const handlePreload3D = () => {
    if (viewMode === '2d') {
      preloadAllControls().catch((error) => {
        console.error('[WizardBar] Failed to preload 3D controls:', error);
      });
    }
  };

  return (
    <header suppressHydrationWarning className="h-14 bg-white border-b border-stone-200 flex items-center px-3 sm:px-4 gap-2 sm:gap-3 shrink-0 z-10">
      <Link href="/" className="font-display text-base font-semibold text-stone-800 tracking-wide whitespace-nowrap">
        ILENA
      </Link>

      {/* Editable project name — disembunyikan di layar kecil untuk hemat ruang */}
      <div className="hidden sm:block h-6 w-px bg-stone-200 mx-1" />
      {editingName ? (
        <input
          autoFocus
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          onBlur={() => setEditingName(false)}
          onKeyDown={(e) => e.key === 'Enter' && setEditingName(false)}
          className="hidden sm:block text-sm font-medium text-stone-700 border-b border-stone-400 bg-transparent focus:outline-none w-40"
        />
      ) : (
        <button
          onClick={() => setEditingName(true)}
          className="hidden sm:block text-sm font-medium text-stone-600 hover:text-stone-800 transition-colors max-w-[140px] truncate"
          title="Klik untuk rename"
        >
          {projectName}
        </button>
      )}

      {/* Step progress — di HP hanya pil angka (label & konektor disembunyikan) */}
      <div className="flex items-center gap-1 flex-1 ml-1 sm:ml-2 overflow-x-auto no-scrollbar">
        {STEPS.map((step, i) => (
          <div key={step.num} className="flex items-center gap-1">
            <button
              onClick={() => setCurrentStep(step.num)}
              className={cn(
                'flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                currentStep === step.num
                  ? 'bg-stone-800 text-white'
                  : currentStep > step.num
                  ? 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  : 'text-stone-400 hover:bg-stone-50 hover:text-stone-600'
              )}
            >
              <span className={cn(
                'w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                currentStep === step.num ? 'bg-white/20' : 'bg-stone-300/40'
              )}>
                {step.num}
              </span>
              {/* Label tampil penuh di >=sm; di HP hanya untuk step aktif */}
              <span className={cn(currentStep === step.num ? 'inline' : 'hidden sm:inline')}>
                {step.label}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={cn('hidden sm:block w-5 h-px', currentStep > step.num ? 'bg-stone-400' : 'bg-stone-200')} />
            )}
          </div>
        ))}
      </div>

      {/* Auto-save indicator — sembunyi di HP untuk hemat ruang */}
      <div className="hidden sm:flex items-center">
        <AutoSaveIndicator isSaving={isSaving} lastSaved={lastSaved} />
      </div>

      {/* View toggle */}
      {currentStep === 3 && (
        <div className="flex items-center bg-stone-100 rounded-lg p-0.5 gap-0.5">
          {(['2d', '3d', 'walk'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              onMouseEnter={mode !== '2d' ? handlePreload3D : undefined}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wide transition-all',
                viewMode === mode ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
              )}
            >
              {mode === 'walk' ? '🚶' : mode.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {/* Manual save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className={cn(
          'flex items-center gap-1.5 text-xs font-medium px-2.5 sm:px-3 py-1.5 rounded-lg border transition-all shrink-0',
          saved
            ? 'border-green-200 bg-green-50 text-green-700'
            : 'border-stone-200 text-stone-600 hover:bg-stone-50'
        )}
      >
        {saved ? <Check size={13} /> : <Save size={13} />}
        <span className="hidden sm:inline">{saving ? 'Menyimpan...' : saved ? 'Tersimpan' : 'Simpan'}</span>
      </button>

      {/* User */}
      {user ? (
        <Link href="/profile" className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-700 transition-colors">
          <div className="w-6 h-6 rounded-full bg-stone-200 flex items-center justify-center text-[10px] font-bold text-stone-600">
            {user.name[0].toUpperCase()}
          </div>
        </Link>
      ) : (
        <Link href="/login" className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-700 transition-colors border border-stone-200 px-2.5 py-1.5 rounded-lg">
          <User size={12} /> Masuk
        </Link>
      )}
    </header>
  );
}
