'use client';
import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import CatalogPanel from './CatalogPanel';
import PropertiesPanel from './PropertiesPanel';
import Canvas2D from './Canvas2D';
import { useEditorStore } from '@/store/editorStore';
import { useIsMobile } from '@/hooks/useIsMobile';
import { Plus, X } from 'lucide-react';


// Dynamic imports — Three.js tidak boleh SSR
const Canvas3D  = dynamic(() => import('./Canvas3D'),   { ssr: false, loading: () => <CanvasLoading label="Memuat tampilan 3D..." /> });
const CanvasWalk = dynamic(() => import('./CanvasWalk'), { ssr: false, loading: () => <CanvasLoading label="Memuat walk-through..." /> });

function CanvasLoading({ label }: { label: string }) {
  return (
    <div className="flex-1 flex items-center justify-center bg-stone-200">
      <div className="text-center text-stone-400">
        <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">{label}</p>
      </div>
    </div>
  );
}

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  thumbnail: string;
  dimensions: { width: number; depth: number; height: number };
}

// Header tipis untuk bottom-sheet mobile (grip + judul + tombol tutup)
function SheetHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="shrink-0 px-4 pt-2 pb-1 border-b border-stone-100">
      <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-stone-300" />
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-stone-700">{title}</span>
        <button
          onClick={onClose}
          aria-label="Tutup"
          className="p-1.5 -mr-1.5 rounded-lg text-stone-500 hover:bg-stone-100 transition-colors"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}

export default function EditorLayout() {
  const { viewMode, setCurrentStep, selectedItemId, setSelectedItem } = useEditorStore();
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const isMobile = useIsMobile();

  const handleDragStart = useCallback((product: Product, e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify(product));
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  const handleAddProduct = useCallback((product: Product) => {
    setPendingProduct(product);
    setCatalogOpen(false); // tutup drawer setelah memilih (mobile)
  }, []);

  const canvas = (
    <div className="flex-1 min-h-0 flex overflow-hidden">
      {viewMode === '2d' && (
        <Canvas2D
          pendingProduct={pendingProduct}
          onProductPlaced={() => setPendingProduct(null)}
        />
      )}
      {viewMode === '3d' && <Canvas3D />}
      {viewMode === 'walk' && <CanvasWalk />}
    </div>
  );

  // ── Layout mobile: canvas full-screen + bottom-sheet ──────────────────────
  if (isMobile) {
    const propsOpen = viewMode !== 'walk' && !!selectedItemId;
    return (
      <div className="relative flex flex-1 min-h-0 overflow-hidden">
        {canvas}

        {/* FAB buka katalog — hanya 2D, dan disembunyikan saat sheet properti aktif */}
        {viewMode === '2d' && !propsOpen && !catalogOpen && (
          <button
            onClick={() => setCatalogOpen(true)}
            className="absolute right-4 bottom-4 z-20 flex items-center gap-1.5 bg-stone-800 text-white text-sm font-medium pl-3 pr-4 py-2.5 rounded-full shadow-lg active:scale-95 transition-transform"
          >
            <Plus size={18} /> Furniture
          </button>
        )}

        {/* Bottom-sheet katalog */}
        {viewMode === '2d' && catalogOpen && (
          <div className="absolute inset-0 z-30 flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/30" onClick={() => setCatalogOpen(false)} />
            <div className="relative bg-white rounded-t-2xl shadow-2xl h-[72%] min-h-0 flex flex-col animate-slide-up overflow-hidden pb-safe">
              <SheetHeader title="Katalog Furniture" onClose={() => setCatalogOpen(false)} />
              <div className="flex-1 min-h-0 flex overflow-hidden">
                <CatalogPanel onDragStart={handleDragStart} onAddProduct={handleAddProduct} />
              </div>
            </div>
          </div>
        )}

        {/* Bottom-sheet properti — muncul saat item dipilih */}
        {propsOpen && (
          <div className="absolute inset-x-0 bottom-0 z-20">
            <div className="bg-white rounded-t-2xl shadow-2xl max-h-[60vh] min-h-0 flex flex-col animate-slide-up overflow-hidden pb-safe">
              <SheetHeader title="Properti Furniture" onClose={() => setSelectedItem(null)} />
              <div className="flex-1 min-h-0 flex overflow-hidden">
                <PropertiesPanel onNavigateToResult={() => setCurrentStep(4)} />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Layout desktop: 3 panel berdampingan ──────────────────────────────────
  return (
    <div className="relative flex flex-1 min-h-0 overflow-hidden">
      {/* Katalog hanya tampil di 2D mode — di 3D/walk tersembunyi untuk max ruang */}
      {viewMode === '2d' && (
        <CatalogPanel onDragStart={handleDragStart} onAddProduct={handleAddProduct} />
      )}

      {canvas}

      {/* Properties hanya di 2D dan 3D */}
      {viewMode !== 'walk' && <PropertiesPanel onNavigateToResult={() => setCurrentStep(4)} />}
    </div>
  );
}
