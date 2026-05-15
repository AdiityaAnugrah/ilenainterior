'use client';
import { useEditorStore } from '@/store/editorStore';
import { formatPrice } from '@/lib/utils';
import { Trash2, RotateCw, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Button from '@/components/ui/Button';

interface PropertiesPanelProps {
  onNavigateToResult?: () => void;
}

export default function PropertiesPanel({ onNavigateToResult }: PropertiesPanelProps) {
  const { items, selectedItemId, updateItem, removeItem, totalPrice } = useEditorStore();
  const selected = items.find((i) => i.id === selectedItemId);

  return (
    <div className="w-72 flex-shrink-0 bg-white border-l border-stone-200 flex flex-col overflow-hidden">
      {selected ? (
        <>
          {/* Item info */}
          <div className="p-3 border-b border-stone-100">
            <div className="relative aspect-video rounded-lg overflow-hidden bg-stone-100 mb-2">
              <Image
                src={selected.thumbnail || '/placeholder-product.jpg'}
                alt={selected.name}
                fill
                className="object-cover"
                sizes="280px"
                loading="lazy"
                placeholder="blur"
                blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y1ZjVmNCIvPjwvc3ZnPg=="
              />
            </div>
            <p className="text-xs font-semibold text-stone-800 line-clamp-2">{selected.name}</p>
            <p className="text-xs text-stone-500 mt-0.5 capitalize">{selected.category}</p>
            <p className="text-sm font-bold text-stone-900 mt-1">{formatPrice(selected.price)}</p>
          </div>

          {/* Position */}
          <div className="p-3 border-b border-stone-100">
            <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide mb-2">Posisi (cm)</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-stone-400">X</label>
                <input
                  type="number"
                  value={Math.round(selected.position.x)}
                  onChange={(e) => updateItem(selected.id, { position: { ...selected.position, x: Number(e.target.value) } })}
                  className="w-full mt-0.5 px-2 py-1 text-xs rounded border border-stone-200 focus:border-stone-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-stone-400">Y</label>
                <input
                  type="number"
                  value={Math.round(selected.position.y)}
                  onChange={(e) => updateItem(selected.id, { position: { ...selected.position, y: Number(e.target.value) } })}
                  className="w-full mt-0.5 px-2 py-1 text-xs rounded border border-stone-200 focus:border-stone-400 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Elevation */}
          <div className="p-3 border-b border-stone-100">
            <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide mb-2">Elevasi (cm)</p>
            <input
              type="number"
              min={0}
              max={Math.round(300 - selected.dimensions.height)}
              value={Math.round((selected.elevation ?? 0) * 100)}
              onChange={(e) =>
                updateItem(selected.id, { elevation: Math.max(0, Number(e.target.value)) / 100 })
              }
              className="w-full px-2 py-1 text-xs rounded border border-stone-200 focus:border-stone-400 focus:outline-none"
            />
            <p className="text-[10px] text-stone-400 mt-1">Tinggi dari lantai · 0 = di lantai</p>
          </div>

          {/* Rotation */}
          <div className="p-3 border-b border-stone-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide">Rotasi</p>
              <button
                onClick={() => updateItem(selected.id, { rotation: (selected.rotation + 90) % 360 })}
                className="p-1 rounded hover:bg-stone-100 text-stone-500 transition-colors"
                title="Putar 90°"
              >
                <RotateCw size={14} />
              </button>
            </div>
            <input
              type="range"
              min={0}
              max={359}
              value={selected.rotation}
              onChange={(e) => updateItem(selected.id, { rotation: Number(e.target.value) })}
              className="w-full accent-stone-600"
            />
            <p className="text-[10px] text-stone-400 text-center mt-1">{selected.rotation}°</p>
          </div>

          {/* Dimensions info */}
          <div className="p-3 border-b border-stone-100">
            <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wide mb-1">Dimensi</p>
            <p className="text-[11px] text-stone-600">
              {selected.dimensions.width} × {selected.dimensions.depth} × {selected.dimensions.height} cm
            </p>
          </div>

          {/* Actions — only delete, no cart */}
          <div className="p-3 flex flex-col gap-2">
            <Button
              variant="danger"
              size="sm"
              className="w-full text-xs gap-1.5"
              onClick={() => removeItem(selected.id)}
            >
              <Trash2 size={13} /> Hapus dari Ruangan
            </Button>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-xs text-stone-300 text-center leading-relaxed">
            Klik furniture di canvas untuk melihat properti
          </p>
        </div>
      )}

      {/* Footer — summary only, no checkout */}
      <div className="p-3 border-t border-stone-200 bg-stone-50">
        <div className="flex justify-between items-center">
          <span className="text-xs text-stone-500">{items.length} item</span>
          <span className="text-xs font-bold text-stone-800">{formatPrice(totalPrice())}</span>
        </div>
        <p className="text-[10px] text-stone-400 mt-1">Total estimasi (furniture + wallpaper)</p>
        
        {/* Navigation button */}
        {onNavigateToResult && (
          <Button
            variant="primary"
            size="sm"
            className="w-full mt-3 text-xs gap-1.5"
            onClick={onNavigateToResult}
          >
            Lihat Hasil <ArrowRight size={13} />
          </Button>
        )}
      </div>
    </div>
  );
}
