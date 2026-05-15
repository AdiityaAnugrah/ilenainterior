'use client';
import { useState, useCallback, lazy, Suspense } from 'react';
import dynamic from 'next/dynamic';
import CatalogPanel from './CatalogPanel';
import PropertiesPanel from './PropertiesPanel';
import Canvas2D from './Canvas2D';
import { useEditorStore } from '@/store/editorStore';


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

export default function EditorLayout() {
  const { viewMode, setCurrentStep } = useEditorStore();
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);

  const handleDragStart = useCallback((product: Product, e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify(product));
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  const handleAddProduct = useCallback((product: Product) => {
    setPendingProduct(product);
  }, []);

  return (
    <div className="relative flex flex-1 overflow-hidden">
      {/* Katalog hanya tampil di 2D mode — di 3D/walk tersembunyi untuk max ruang */}
      {viewMode === '2d' && (
        <CatalogPanel onDragStart={handleDragStart} onAddProduct={handleAddProduct} />
      )}

      <div className="flex-1 flex overflow-hidden">
        {viewMode === '2d' && (
          <Canvas2D
            pendingProduct={pendingProduct}
            onProductPlaced={() => setPendingProduct(null)}
          />
        )}
        {viewMode === '3d' && <Canvas3D />}
        {viewMode === 'walk' && <CanvasWalk />}
      </div>

      {/* Properties hanya di 2D dan 3D */}
      {viewMode !== 'walk' && <PropertiesPanel onNavigateToResult={() => setCurrentStep(4)} />}
    </div>
  );
}
