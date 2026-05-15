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
    <header suppressHydrationWarning className="h-14 bg-white border-b border-stone-200 flex items-center px-4 gap-3 shrink-0 z-10">
      <Link href="/" className="font-display text-base font-semibold text-stone-800 tracking-wide whitespace-nowrap">
        ILENA
      </Link>

      {/* Editable project name */}
      <div className="h-6 w-px bg-stone-200 mx-1" />
      {editingName ? (
        <input
          autoFocus
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          onBlur={() => setEditingName(false)}
          onKeyDown={(e) => e.key === 'Enter' && setEditingName(false)}
          className="text-sm font-medium text-stone-700 border-b border-stone-400 bg-transparent focus:outline-none w-40"
        />
      ) : (
        <button
          onClick={() => setEditingName(true)}
          className="text-sm font-medium text-stone-600 hover:text-stone-800 transition-colors max-w-[140px] truncate"
          title="Klik untuk rename"
        >
          {projectName}
        </button>
      )}

      {/* Step progress */}
      <div className="flex items-center gap-1 flex-1 ml-2">
        {STEPS.map((step, i) => (
          <div key={step.num} className="flex items-center gap-1">
            <button
              onClick={() => setCurrentStep(step.num)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                currentStep === step.num
                  ? 'bg-stone-800 text-white'
                  : currentStep > step.num
                  ? 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  : 'text-stone-400 hover:bg-stone-50 hover:text-stone-600'
              )}
            >
              <span className={cn(
                'w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold',
                currentStep === step.num ? 'bg-white/20' : 'bg-stone-300/40'
              )}>
                {step.num}
              </span>
              {step.label}
            </button>
            {i < STEPS.length - 1 && (
              <div className={cn('w-5 h-px', currentStep > step.num ? 'bg-stone-400' : 'bg-stone-200')} />
            )}
          </div>
        ))}
      </div>

      {/* Auto-save indicator */}
      <AutoSaveIndicator isSaving={isSaving} lastSaved={lastSaved} />

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
          'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all',
          saved
            ? 'border-green-200 bg-green-50 text-green-700'
            : 'border-stone-200 text-stone-600 hover:bg-stone-50'
        )}
      >
        {saved ? <Check size={13} /> : <Save size={13} />}
        {saving ? 'Menyimpan...' : saved ? 'Tersimpan' : 'Simpan'}
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
