'use client';
import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import WizardBar from '@/components/planner/WizardBar';
import Step1Room from '@/components/planner/Step1Room';
import EditorLayout from '@/components/planner/EditorLayout';
import { useEditorStore } from '@/store/editorStore';
import { setGuestToken } from '@/lib/guestToken';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const Step3Material = dynamic(() => import('@/components/planner/Step3Material'), { ssr: false });
const Step4Result   = dynamic(() => import('@/components/planner/Step4Result'),   { ssr: false });

function PlannerContent() {
  const { currentStep, loadProject } = useEditorStore();
  const searchParams = useSearchParams();

  useEffect(() => {
    const loadSharedProject = async () => {
      // Check if guest_token is in URL
      const guestTokenFromUrl = searchParams.get('guest_token');
      if (guestTokenFromUrl) {
        // Store guest token in localStorage so user can access the shared project
        setGuestToken(guestTokenFromUrl);
        console.log('[Guest Token] Loaded from URL:', guestTokenFromUrl);
      }

      // Check if project_id is in URL
      const projectIdFromUrl = searchParams.get('project_id');
      if (projectIdFromUrl) {
        try {
          console.log('[Load Project] Loading project:', projectIdFromUrl);
          const { data } = await api.get(`/projects/${projectIdFromUrl}`);
          
          // Load project data into editor store
          loadProject(
            data.id,
            data.name || 'Proyek Baru',
            data.room_config || {},
            data.items || []
          );
          
          toast.success('Proyek berhasil dimuat');
          console.log('[Load Project] Project loaded successfully');
        } catch (error) {
          console.error('[Load Project Error]', error);
          toast.error('Gagal memuat proyek');
        }
      }
    };

    loadSharedProject();
  }, [searchParams, loadProject]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        useEditorStore.getState().undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        useEditorStore.getState().redo();
      }
      if (e.key === 'Delete') {
        const { selectedItemId, removeItem } = useEditorStore.getState();
        if (selectedItemId) removeItem(selectedItemId);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-stone-50">
      <WizardBar />
      <div className="flex flex-1 overflow-hidden">
        {currentStep === 1 && <Step1Room />}
        {currentStep === 2 && <Step3Material />}
        {currentStep === 3 && <EditorLayout />}
        {currentStep === 4 && <Step4Result />}
      </div>
    </div>
  );
}

export default function PlannerPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-stone-600">Loading planner...</p>
        </div>
      </div>
    }>
      <PlannerContent />
    </Suspense>
  );
}
