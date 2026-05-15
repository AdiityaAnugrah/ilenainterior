'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useEditorStore, WallSide } from '@/store/editorStore';
import { formatPrice } from '@/lib/utils';
import { ArrowLeft, Download, MessageCircle, Copy, Check } from 'lucide-react';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';
import api from '@/lib/api';

const Canvas3D   = dynamic(() => import('./Canvas3D'),   { ssr: false });
const CanvasWalk = dynamic(() => import('./CanvasWalk'), { ssr: false });

type PreviewMode = '3d' | 'walk';

const WALL_LABELS: Record<WallSide, string> = {
  north: 'Utara', south: 'Selatan', east: 'Timur', west: 'Barat',
};

export default function Step4Result() {
  const { items, roomConfig, setCurrentStep, totalFurniturePrice, totalWallpaperPrice, totalPrice, projectName } = useEditorStore();
  const [mode, setMode] = useState<PreviewMode>('3d');
  const [copied, setCopied] = useState(false);
  const [waNumber, setWaNumber] = useState('');

  useEffect(() => {
    api.get('/wallpapers/settings/whatsapp')
      .then(r => setWaNumber(r.data.whatsapp_number || ''))
      .catch(() => {});
  }, []);

  const handleExport = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) { toast.error('Canvas tidak ditemukan'); return; }
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png', 1.0);
    link.download = `ilena-interior-${Date.now()}.png`;
    link.click();
    toast.success('Gambar berhasil diunduh');
  };

  const handleCopyLink = async () => {
    // Build URL with project_id and guest_token
    const guestToken = localStorage.getItem('guest_token');
    const { projectId } = useEditorStore.getState();
    
    let url = `${window.location.origin}/planner`;
    if (projectId && guestToken) {
      url += `?project_id=${projectId}&guest_token=${guestToken}`;
    } else if (projectId) {
      url += `?project_id=${projectId}`;
    } else if (guestToken) {
      url += `?guest_token=${guestToken}`;
    }
    
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link disalin!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Gagal menyalin link');
    }
  };

  const handleShareWA = () => {
    if (!waNumber) {
      toast.error('Nomor WhatsApp belum diatur. Hubungi admin.');
      return;
    }

    // Get current project URL with guest token and project ID
    const guestToken = localStorage.getItem('guest_token');
    const { projectId } = useEditorStore.getState();
    
    let projectUrl = `${window.location.origin}/planner`;
    if (projectId && guestToken) {
      projectUrl += `?project_id=${projectId}&guest_token=${guestToken}`;
    } else if (projectId) {
      projectUrl += `?project_id=${projectId}`;
    } else if (guestToken) {
      projectUrl += `?guest_token=${guestToken}`;
    }

    // Build message
    const lines: string[] = [];
    lines.push('*ILENA INTERIOR — Konsultasi Desain*');
    lines.push('');
    lines.push(`*Proyek:* ${projectName}`);
    lines.push(`*Ukuran Ruangan:* ${roomConfig.width} × ${roomConfig.depth} × ${roomConfig.height} m`);
    lines.push(`*Tipe:* ${roomConfig.roomType.replace('_', ' ')}`);
    lines.push('');

    if (items.length > 0) {
      lines.push(`*Furniture (${items.length} item):*`);
      items.forEach((item, i) => {
        lines.push(`  ${i + 1}. ${item.name} — ${formatPrice(item.price)}`);
      });
      lines.push(`  *Subtotal Furniture:* ${formatPrice(totalFurniturePrice())}`);
      lines.push('');
    }

    const wallpapers = roomConfig.wallpapers ?? {};
    const wpEntries = Object.entries(wallpapers).filter(([, v]) => v) as [WallSide, NonNullable<typeof wallpapers[WallSide]>][];
    if (wpEntries.length > 0) {
      lines.push('*Wallpaper:*');
      wpEntries.forEach(([side, wp]) => {
        const len = side === 'north' || side === 'south' ? roomConfig.width : roomConfig.depth;
        lines.push(`  • Dinding ${WALL_LABELS[side]}: ${wp.name} — ${formatPrice(wp.price_per_meter)}/m × ${len}m = ${formatPrice(wp.price_per_meter * len)}`);
      });
      lines.push(`  *Subtotal Wallpaper:* ${formatPrice(totalWallpaperPrice())}`);
      lines.push('');
    }

    lines.push(`*TOTAL ESTIMASI: ${formatPrice(totalPrice())}*`);
    lines.push('');
    lines.push(`*Lihat Desain:* ${projectUrl}`);
    lines.push('');
    lines.push('Saya tertarik dengan desain ini, mohon bantu follow up untuk pemesanan. Terima kasih!');

    const text = encodeURIComponent(lines.join('\n'));
    const waUrl = `https://wa.me/${waNumber.replace(/[^0-9]/g, '')}?text=${text}`;
    window.open(waUrl, '_blank');
    toast.success('Membuka WhatsApp...');
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left panel */}
      <div className="w-72 flex-shrink-0 bg-white border-r border-stone-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-stone-100">
          <h2 className="text-base font-semibold text-stone-800 mb-1">Hasil Desain</h2>
          <p className="text-xs text-stone-500">Lihat ruangan, ekspor, dan konsultasi via WA.</p>

          {/* Preview mode toggle */}
          <div className="flex bg-stone-100 rounded-lg p-0.5 gap-0.5 mt-3">
            {(['3d', 'walk'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all capitalize ${mode === m ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500'}`}
              >
                {m === 'walk' ? '🚶 Walk' : '🏠 3D'}
              </button>
            ))}
          </div>
        </div>

        {/* Room summary */}
        <div className="p-4 border-b border-stone-100">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Ringkasan Ruangan</p>
          <div className="space-y-1 text-xs text-stone-600">
            <div className="flex justify-between">
              <span>Ukuran</span>
              <span className="font-medium">{roomConfig.width} × {roomConfig.depth} × {roomConfig.height} m</span>
            </div>
            <div className="flex justify-between">
              <span>Tipe</span>
              <span className="font-medium capitalize">{roomConfig.roomType.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between">
              <span>Total item</span>
              <span className="font-medium">{items.length} furniture</span>
            </div>
          </div>
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">Daftar Furniture</p>
          {items.length === 0 ? (
            <p className="text-xs text-stone-300 text-center py-4">Belum ada furniture</p>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-stone-50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-stone-700 truncate">{item.name}</p>
                    <p className="text-[10px] text-stone-400 capitalize">{item.category}</p>
                  </div>
                  <span className="text-xs font-semibold text-stone-800 whitespace-nowrap">{formatPrice(item.price)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Wallpaper summary */}
          {(() => {
            const wp = roomConfig.wallpapers ?? {};
            const entries = Object.entries(wp).filter(([, v]) => v) as [WallSide, NonNullable<typeof wp[WallSide]>][];
            if (entries.length === 0) return null;
            return (
              <>
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mt-4 mb-3">Wallpaper Dinding</p>
                <div className="space-y-2">
                  {entries.map(([side, w]) => {
                    const len = side === 'north' || side === 'south' ? roomConfig.width : roomConfig.depth;
                    return (
                      <div key={side} className="flex items-center justify-between gap-2 py-1.5 border-b border-stone-50 last:border-0">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-stone-700 truncate">{w.name}</p>
                          <p className="text-[10px] text-stone-400">Dinding {WALL_LABELS[side]} ({len}m)</p>
                        </div>
                        <span className="text-xs font-semibold text-stone-800 whitespace-nowrap">{formatPrice(w.price_per_meter * len)}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-stone-200 space-y-2">
          {/* Totals */}
          <div className="space-y-1 py-2 border-b border-stone-100">
            {totalFurniturePrice() > 0 && (
              <div className="flex justify-between text-xs text-stone-500">
                <span>Furniture</span>
                <span>{formatPrice(totalFurniturePrice())}</span>
              </div>
            )}
            {totalWallpaperPrice() > 0 && (
              <div className="flex justify-between text-xs text-stone-500">
                <span>Wallpaper</span>
                <span>{formatPrice(totalWallpaperPrice())}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-1">
              <span className="text-sm font-semibold text-stone-700">Total Estimasi</span>
              <span className="text-base font-bold text-stone-900">{formatPrice(totalPrice())}</span>
            </div>
          </div>

          <Button onClick={handleExport} variant="outline" size="sm" className="w-full gap-2">
            <Download size={14} /> Export PNG
          </Button>

          <Button onClick={handleCopyLink} variant="outline" size="sm" className="w-full gap-2">
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Link disalin!' : 'Salin Link Desain'}
          </Button>

          {/* Share WA — primary CTA */}
          <Button
            size="md"
            className="w-full gap-2"
            style={{ backgroundColor: '#25D366', borderColor: '#25D366' }}
            onClick={handleShareWA}
          >
            <MessageCircle size={15} /> Konsultasi via WhatsApp
          </Button>

          <button
            onClick={() => setCurrentStep(3)}
            className="w-full text-xs text-stone-400 hover:text-stone-600 transition-colors flex items-center justify-center gap-1 py-1"
          >
            <ArrowLeft size={12} /> Kembali ke Furniture
          </button>
        </div>
      </div>

      {/* Right — 3D / Walk */}
      <div className="flex-1 overflow-hidden flex">
        {mode === '3d'   && <Canvas3D />}
        {mode === 'walk' && <CanvasWalk />}
      </div>
    </div>
  );
}
