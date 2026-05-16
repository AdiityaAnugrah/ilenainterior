'use client';
import { useState, useEffect } from 'react';
import { useEditorStore, WallSide, WallpaperData } from '@/store/editorStore';
import { cn, formatPrice } from '@/lib/utils';
import { ArrowRight, ArrowLeft, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import Canvas3D from './Canvas3D';
import api from '@/lib/api';
import Image from 'next/image';

const WALL_COLORS = [
  { name: 'Putih Hangat', value: '#F5F5F0' },
  { name: 'Krem', value: '#EDE7D9' },
  { name: 'Greige', value: '#D9D0C1' },
  { name: 'Abu Muda', value: '#E8E8E8' },
  { name: 'Sage', value: '#C8D5C0' },
  { name: 'Biru Mist', value: '#C5CDD6' },
  { name: 'Terracotta', value: '#D4A08A' },
  { name: 'Putih Bersih', value: '#FFFFFF' },
];

const FLOOR_MATERIALS = [
  { name: 'Parket Kayu', value: 'parket', color: '#C4965A', preview: '▦' },
  { name: 'Ubin Putih', value: 'ubin', color: '#E8E8E8', preview: '⊞' },
  { name: 'Marmer', value: 'marmer', color: '#F0EDE8', preview: '◈' },
  { name: 'Karpet Coklat', value: 'karpet', color: '#8B7355', preview: '▣' },
  { name: 'Beton Poles', value: 'beton', color: '#BDBDBD', preview: '▪' },
  { name: 'Kayu Gelap', value: 'kayu', color: '#A0785A', preview: '▦' },
];

const WALL_TEXTURES = [
  { name: 'Polos',      value: 'plain',     preview: '░' },
  { name: 'Bata',       value: 'brick',     preview: '▦' },
  { name: 'Garis',      value: 'stripes',   preview: '≡' },
  { name: 'Geometris',  value: 'geometric', preview: '◇' },
  { name: 'Beton',      value: 'concrete',  preview: '▒' },
  { name: 'Kayu',       value: 'wood',      preview: '║' },
];

const WALL_SIDES: { key: WallSide; label: string; icon: string }[] = [
  { key: 'north', label: 'Utara', icon: '↑' },
  { key: 'south', label: 'Selatan', icon: '↓' },
  { key: 'east',  label: 'Timur', icon: '→' },
  { key: 'west',  label: 'Barat', icon: '←' },
];

interface WallpaperItem {
  id: number;
  name: string;
  category: string;
  price_per_meter: number;
  thumbnail: string | null;
  texture_pattern: string;
  color: string;
  description: string;
}

export default function Step3Material() {
  const { roomConfig, setRoomConfig, setCurrentStep, setWallpaper } = useEditorStore();
  const [activeTab, setActiveTab] = useState<'lantai' | 'dinding' | 'wallpaper'>('lantai');
  const [wallpapers, setWallpapers] = useState<WallpaperItem[]>([]);
  const [loadingWp, setLoadingWp] = useState(false);
  const [selectedWall, setSelectedWall] = useState<WallSide>('north');

  // Fetch wallpapers
  useEffect(() => {
    if (activeTab === 'wallpaper') {
      setLoadingWp(true);
      api.get('/api/wallpapers')
        .then(r => setWallpapers(r.data))
        .catch(() => setWallpapers([]))
        .finally(() => setLoadingWp(false));
    }
  }, [activeTab]);

  const currentWallpaper = roomConfig.wallpapers?.[selectedWall] ?? null;

  const getWallLength = (side: WallSide) =>
    side === 'north' || side === 'south' ? roomConfig.width : roomConfig.depth;

  const applyWallpaper = (wp: WallpaperItem) => {
    const data: WallpaperData = {
      id: wp.id,
      name: wp.name,
      price_per_meter: wp.price_per_meter,
      texture_pattern: wp.texture_pattern,
      color: wp.color,
      thumbnail: wp.thumbnail ?? undefined,
    };
    setWallpaper(selectedWall, data);
  };

  const removeWallpaper = (side: WallSide) => {
    setWallpaper(side, null);
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left — Material controls */}
      <div className="w-72 flex-shrink-0 bg-white border-r border-stone-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-stone-100">
          <h2 className="text-base font-semibold text-stone-800 mb-1">Material & Warna</h2>
          <p className="text-xs text-stone-500">Kustomisasi tampilan ruangan kamu.</p>

          {/* Tabs */}
          <div className="flex bg-stone-100 rounded-lg p-0.5 gap-0.5 mt-3">
            {(['lantai', 'dinding', 'wallpaper'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'flex-1 py-1.5 text-xs font-medium rounded-md transition-all capitalize',
                  activeTab === tab ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
                )}
              >
                {tab === 'wallpaper' ? '🖼️ Wallpaper' : tab}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'lantai' && (
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">Pilih Material Lantai</p>
              <div className="grid grid-cols-2 gap-2">
                {FLOOR_MATERIALS.map((mat) => (
                  <button
                    key={mat.value}
                    onClick={() => setRoomConfig({ floorMaterial: mat.value, floorColor: undefined })}
                    className={cn(
                      'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all',
                      roomConfig.floorMaterial === mat.value
                        ? 'border-stone-800 bg-stone-50'
                        : 'border-stone-100 hover:border-stone-300'
                    )}
                  >
                    <div
                      className="w-12 h-12 rounded-lg shadow-inner flex items-center justify-center text-white/50 text-xl"
                      style={{ backgroundColor: mat.color }}
                    >
                      {mat.preview}
                    </div>
                    <span className="text-[11px] font-medium text-stone-700 text-center leading-tight">
                      {mat.name}
                    </span>
                    {roomConfig.floorMaterial === mat.value && (
                      <span className="text-[10px] text-stone-500 font-medium">✓ Dipilih</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Custom hex for floor */}
              <div className="mt-5">
                <p className="text-xs text-stone-500 mb-2">Atau pilih warna custom lantai:</p>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={roomConfig.floorColor || FLOOR_MATERIALS.find(m => m.value === roomConfig.floorMaterial)?.color || '#C4965A'}
                    onChange={(e) => setRoomConfig({ floorColor: e.target.value })}
                    className="w-10 h-10 rounded-lg border border-stone-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={roomConfig.floorColor || ''}
                    onChange={(e) => {
                      if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value) || e.target.value === '') {
                        setRoomConfig({ floorColor: e.target.value || undefined });
                      }
                    }}
                    className="flex-1 px-2 py-1.5 text-xs font-mono border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400"
                    placeholder="Warna dari material"
                    maxLength={7}
                  />
                </div>
                {roomConfig.floorColor && (
                  <button 
                    onClick={() => setRoomConfig({ floorColor: undefined })}
                    className="mt-2 text-[10px] text-red-500 hover:text-red-600 underline"
                  >
                    Hapus warna custom (kembali ke bawaan material)
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'dinding' && (
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">Pilih Warna Dinding</p>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {WALL_COLORS.map((wc) => (
                  <button
                    key={wc.value}
                    onClick={() => setRoomConfig({ wallColor: wc.value })}
                    title={wc.name}
                    className={cn(
                      'aspect-square rounded-xl border-2 transition-all',
                      roomConfig.wallColor === wc.value
                        ? 'border-stone-800 scale-110 shadow-md'
                        : 'border-stone-200 hover:border-stone-400 hover:scale-105'
                    )}
                    style={{ backgroundColor: wc.value }}
                  />
                ))}
              </div>

              {/* Custom hex */}
              <div>
                <p className="text-xs text-stone-500 mb-2">Atau pilih warna custom:</p>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={roomConfig.wallColor}
                    onChange={(e) => setRoomConfig({ wallColor: e.target.value })}
                    className="w-10 h-10 rounded-lg border border-stone-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={roomConfig.wallColor}
                    onChange={(e) => /^#[0-9A-Fa-f]{0,6}$/.test(e.target.value) && setRoomConfig({ wallColor: e.target.value })}
                    className="flex-1 px-2 py-1.5 text-xs font-mono border border-stone-200 rounded-lg focus:outline-none focus:border-stone-400"
                    placeholder="#F5F5F0"
                    maxLength={7}
                  />
                </div>
              </div>

              {/* Preview swatch */}
              <div
                className="mt-4 rounded-xl h-16 flex items-center justify-center border border-stone-200"
                style={{ backgroundColor: roomConfig.wallColor }}
              >
                <span className="text-xs text-stone-500/60">Preview warna</span>
              </div>

              {/* Tekstur / Wallpaper */}
              <div className="mt-5">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">Tekstur Dinding</p>
                <div className="grid grid-cols-3 gap-2">
                  {WALL_TEXTURES.map((tx) => (
                    <button
                      key={tx.value}
                      onClick={() => setRoomConfig({ wallTexture: tx.value })}
                      className={cn(
                        'flex flex-col items-center gap-1.5 py-2.5 rounded-xl border-2 transition-all',
                        (roomConfig.wallTexture ?? 'plain') === tx.value
                          ? 'border-stone-800 bg-stone-50'
                          : 'border-stone-100 hover:border-stone-300'
                      )}
                    >
                      <span className="text-lg leading-none">{tx.preview}</span>
                      <span className="text-[10px] font-medium text-stone-600">{tx.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'wallpaper' && (
            <div>
              {/* Wall selector */}
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Pilih Dinding</p>
              <div className="grid grid-cols-4 gap-1.5 mb-4">
                {WALL_SIDES.map((ws) => {
                  const hasWp = !!roomConfig.wallpapers?.[ws.key];
                  return (
                    <button
                      key={ws.key}
                      onClick={() => setSelectedWall(ws.key)}
                      className={cn(
                        'flex flex-col items-center gap-0.5 py-2 rounded-lg border-2 transition-all text-xs',
                        selectedWall === ws.key
                          ? 'border-stone-800 bg-stone-50 font-semibold'
                          : 'border-stone-100 hover:border-stone-300',
                        hasWp && 'ring-2 ring-green-300'
                      )}
                    >
                      <span className="text-sm">{ws.icon}</span>
                      <span className="text-[10px]">{ws.label}</span>
                      {hasWp && <span className="text-[8px] text-green-600">✓</span>}
                    </button>
                  );
                })}
              </div>

              {/* Current wallpaper on selected wall */}
              {currentWallpaper && (
                <div className="mb-4 bg-green-50 rounded-xl p-3 border border-green-200">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-green-800">Wallpaper terpasang</p>
                    <button
                      onClick={() => removeWallpaper(selectedWall)}
                      className="text-red-400 hover:text-red-600 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <p className="text-xs text-green-700">{currentWallpaper.name}</p>
                  <p className="text-[10px] text-green-600">
                    {formatPrice(currentWallpaper.price_per_meter)}/m × {getWallLength(selectedWall)}m = {formatPrice(currentWallpaper.price_per_meter * getWallLength(selectedWall))}
                  </p>
                </div>
              )}

              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">
                Pilih Wallpaper — Dinding {WALL_SIDES.find(w => w.key === selectedWall)?.label}
              </p>
              <p className="text-[10px] text-stone-400 mb-3">
                Panjang dinding: {getWallLength(selectedWall)} meter
              </p>

              {loadingWp ? (
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="aspect-square rounded-lg bg-stone-100 animate-pulse" />
                  ))}
                </div>
              ) : wallpapers.length === 0 ? (
                <p className="text-xs text-stone-400 text-center py-6">Belum ada wallpaper. Tambahkan via admin panel.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {wallpapers.map((wp) => {
                    const isSelected = currentWallpaper?.id === wp.id;
                    const cost = wp.price_per_meter * getWallLength(selectedWall);
                    return (
                      <button
                        key={wp.id}
                        onClick={() => applyWallpaper(wp)}
                        className={cn(
                          'flex flex-col rounded-xl border-2 overflow-hidden transition-all text-left',
                          isSelected
                            ? 'border-stone-800 bg-stone-50'
                            : 'border-stone-100 hover:border-stone-300'
                        )}
                      >
                        {wp.thumbnail ? (
                          <div className="relative aspect-square">
                            <Image
                              src={wp.thumbnail}
                              alt={wp.name}
                              fill
                              className="object-cover"
                              sizes="150px"
                              loading="lazy"
                              placeholder="blur"
                              blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y1ZjVmNCIvPjwvc3ZnPg=="
                            />
                          </div>
                        ) : (
                          <div
                            className="aspect-square flex items-center justify-center"
                            style={{ backgroundColor: wp.color }}
                          >
                            <span className="text-2xl opacity-30">🖼️</span>
                          </div>
                        )}
                        <div className="p-2">
                          <p className="text-[10px] font-medium text-stone-700 line-clamp-1">{wp.name}</p>
                          <p className="text-[10px] text-stone-500">{formatPrice(wp.price_per_meter)}/m</p>
                          <p className="text-[10px] font-semibold text-stone-800 mt-0.5">{formatPrice(cost)}</p>
                        </div>
                        {isSelected && (
                          <div className="px-2 pb-1.5">
                            <span className="text-[9px] bg-stone-800 text-white px-1.5 py-0.5 rounded-full">✓ Dipilih</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Wallpaper price summary */}
              {Object.keys(roomConfig.wallpapers ?? {}).some(k => roomConfig.wallpapers?.[k as WallSide]) && (
                <div className="mt-4 bg-stone-50 rounded-xl p-3 border border-stone-200">
                  <p className="text-xs font-semibold text-stone-600 mb-2">Ringkasan Wallpaper</p>
                  {WALL_SIDES.map(ws => {
                    const w = roomConfig.wallpapers?.[ws.key];
                    if (!w) return null;
                    const len = getWallLength(ws.key);
                    return (
                      <div key={ws.key} className="flex justify-between text-[10px] text-stone-600 mb-1">
                        <span>{ws.label}: {w.name} ({len}m)</span>
                        <span className="font-medium">{formatPrice(w.price_per_meter * len)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Nav buttons */}
        <div className="p-4 border-t border-stone-100 flex gap-2">
          <Button variant="outline" onClick={() => setCurrentStep(1)} className="flex-1 gap-1">
            <ArrowLeft size={14} /> Ruangan
          </Button>
          <Button onClick={() => setCurrentStep(3)} className="flex-1 gap-1">
            Furniture <ArrowRight size={14} />
          </Button>
        </div>
      </div>

      {/* Right — Live 3D preview */}
      <Canvas3D />
    </div>
  );
}
