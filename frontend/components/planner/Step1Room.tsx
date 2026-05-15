'use client';
import { useState } from 'react';
import { useEditorStore } from '@/store/editorStore';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

const ROOM_TYPES = [
  { value: 'ruang_tamu', label: 'Ruang Tamu', icon: '🛋️' },
  { value: 'kamar_tidur', label: 'Kamar Tidur', icon: '🛏️' },
  { value: 'dapur', label: 'Dapur', icon: '🍳' },
  { value: 'kantor', label: 'Kantor', icon: '💼' },
  { value: 'lainnya', label: 'Lainnya', icon: '🏠' },
];

const GRID_PX = 80; // px per meter in preview

export default function Step1Room() {
  const { roomConfig, setRoomConfig, setCurrentStep } = useEditorStore();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!roomConfig.width || roomConfig.width < 1 || roomConfig.width > 30)
      e.width = 'Lebar harus antara 1–30 meter';
    if (!roomConfig.depth || roomConfig.depth < 1 || roomConfig.depth > 30)
      e.depth = 'Panjang harus antara 1–30 meter';
    if (!roomConfig.height || roomConfig.height < 2 || roomConfig.height > 6)
      e.height = 'Tinggi harus antara 2–6 meter';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (validate()) setCurrentStep(2);
  };

  const previewW = Math.round(roomConfig.width * GRID_PX);
  const previewD = Math.round(roomConfig.depth * GRID_PX);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left panel — Form */}
      <div className="w-72 flex-shrink-0 bg-white border-r border-stone-200 flex flex-col overflow-y-auto">
        <div className="p-6 flex flex-col gap-6 flex-1">
          <div>
            <h2 className="text-lg font-semibold text-stone-800 mb-1">Atur Ukuran Ruangan</h2>
            <p className="text-sm text-stone-500">Masukkan dimensi ruangan yang ingin kamu desain.</p>
          </div>

          {/* Room type */}
          <div>
            <label className="text-sm font-medium text-stone-700 block mb-2">Tipe Ruangan</label>
            <div className="grid grid-cols-1 gap-2">
              {ROOM_TYPES.map((rt) => (
                <button
                  key={rt.value}
                  onClick={() => setRoomConfig({ roomType: rt.value })}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm font-medium text-left transition-all',
                    roomConfig.roomType === rt.value
                      ? 'border-stone-800 bg-stone-50 text-stone-800'
                      : 'border-stone-200 text-stone-600 hover:border-stone-300'
                  )}
                >
                  <span className="text-lg">{rt.icon}</span>
                  {rt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dimensions */}
          <div className="flex flex-col gap-3">
            <Input
              label="Lebar"
              type="number"
              min={1}
              max={30}
              step={0.1}
              unit="m"
              value={roomConfig.width}
              onChange={(e) => setRoomConfig({ width: parseFloat(e.target.value) || 0 })}
              error={errors.width}
            />
            <Input
              label="Panjang"
              type="number"
              min={1}
              max={30}
              step={0.1}
              unit="m"
              value={roomConfig.depth}
              onChange={(e) => setRoomConfig({ depth: parseFloat(e.target.value) || 0 })}
              error={errors.depth}
            />
            <Input
              label="Tinggi Langit-langit"
              type="number"
              min={2}
              max={6}
              step={0.1}
              unit="m"
              value={roomConfig.height}
              onChange={(e) => setRoomConfig({ height: parseFloat(e.target.value) || 0 })}
              error={errors.height}
            />
          </div>

          {/* Room info */}
          <div className="bg-stone-50 rounded-lg p-3 text-sm text-stone-600">
            <div className="flex justify-between"><span>Luas lantai</span><span className="font-medium">{(roomConfig.width * roomConfig.depth).toFixed(1)} m²</span></div>
            <div className="flex justify-between mt-1"><span>Volume</span><span className="font-medium">{(roomConfig.width * roomConfig.depth * roomConfig.height).toFixed(1)} m³</span></div>
          </div>
        </div>

        <div className="p-6 border-t border-stone-100">
          <Button onClick={handleNext} size="lg" className="w-full">
            Lanjut ke Furniture <ArrowRight size={16} />
          </Button>
        </div>
      </div>

      {/* Right — Live preview denah */}
      <div className="flex-1 bg-stone-100 flex items-center justify-center overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.06) 1px, transparent 1px)',
            backgroundSize: `${GRID_PX}px ${GRID_PX}px`,
          }}
        />

        <div className="relative flex flex-col items-center">
          {/* Room outline */}
          <div
            className="bg-stone-50 border-4 border-stone-800 relative shadow-2xl transition-all duration-300"
            style={{ width: previewW, height: previewD }}
          >
            {/* Compass */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs text-stone-400 font-medium">↑ N</div>

            {/* Dimension labels */}
            <div
              className="absolute -bottom-7 left-0 right-0 flex justify-center text-xs text-stone-600 font-medium"
            >
              {roomConfig.width} m
            </div>
            <div
              className="absolute top-0 bottom-0 -right-8 flex items-center text-xs text-stone-600 font-medium"
              style={{ writingMode: 'vertical-rl' }}
            >
              {roomConfig.depth} m
            </div>

            {/* Door indicator */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-2 bg-stone-200 border border-stone-300" />

            {/* Empty state hint */}
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-xs text-stone-300 text-center px-4">
                Denah ruangan<br />
                {roomConfig.width} × {roomConfig.depth} m
              </p>
            </div>
          </div>

          {/* Scale note */}
          <p className="mt-12 text-xs text-stone-400">
            Skala: 1 grid = 1 meter
          </p>
        </div>
      </div>
    </div>
  );
}
