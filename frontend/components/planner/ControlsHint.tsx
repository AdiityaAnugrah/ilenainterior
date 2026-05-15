'use client';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  mode: '3d' | 'walk';
  walkActive?: boolean;
}

interface PressedState {
  left: boolean;
  right: boolean;
  scroll: boolean;
  w: boolean;
  a: boolean;
  s: boolean;
  d: boolean;
}

function Key({ label, active, wide }: { label: string; active?: boolean; wide?: boolean }) {
  return (
    <div className={cn(
      'flex items-center justify-center rounded border text-[10px] font-semibold transition-all duration-75 select-none',
      wide ? 'px-2.5 py-1' : 'w-6 h-6',
      active
        ? 'bg-stone-700 border-stone-500 text-white shadow-inner'
        : 'bg-stone-800/60 border-stone-600 text-stone-300',
    )}>
      {label}
    </div>
  );
}

function MouseIcon({ left, right, scroll }: { left: boolean; right: boolean; scroll: boolean }) {
  return (
    <svg width="36" height="52" viewBox="0 0 36 52" fill="none" className="flex-shrink-0">
      {/* Body */}
      <rect x="1" y="1" width="34" height="50" rx="11" fill="#1c1917" stroke="#44403c" strokeWidth="1.5" />
      {/* Divider centre */}
      <line x1="18" y1="1" x2="18" y2="22" stroke="#44403c" strokeWidth="1" />
      {/* Left button */}
      <rect x="2" y="2" width="15" height="20" rx="9" fill={left ? '#d6d3d1' : '#292524'} className="transition-colors duration-75" />
      {/* Right button */}
      <rect x="19" y="2" width="15" height="20" rx="9" fill={right ? '#d6d3d1' : '#292524'} className="transition-colors duration-75" />
      {/* Scroll wheel */}
      <rect x="15" y="8" width="6" height="10" rx="3" fill={scroll ? '#d6d3d1' : '#57534e'} className="transition-colors duration-75" />
      {/* Cable */}
      <line x1="18" y1="0" x2="18" y2="-4" stroke="#44403c" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function ControlsHint({ mode, walkActive = true }: Props) {
  const [p, setP] = useState<PressedState>({
    left: false, right: false, scroll: false,
    w: false, a: false, s: false, d: false,
  });

  useEffect(() => {
    const down = (e: MouseEvent) => setP(prev => ({
      ...prev,
      left:   e.button === 0 ? true : prev.left,
      scroll: e.button === 1 ? true : prev.scroll,
      right:  e.button === 2 ? true : prev.right,
    }));
    const up = (e: MouseEvent) => setP(prev => ({
      ...prev,
      left:   e.button === 0 ? false : prev.left,
      scroll: e.button === 1 ? false : prev.scroll,
      right:  e.button === 2 ? false : prev.right,
    }));
    const kdown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      setP(prev => ({
        ...prev,
        w: k === 'w' || k === 'arrowup'    ? true : prev.w,
        s: k === 's' || k === 'arrowdown'  ? true : prev.s,
        a: k === 'a' || k === 'arrowleft'  ? true : prev.a,
        d: k === 'd' || k === 'arrowright' ? true : prev.d,
      }));
    };
    const kup = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      setP(prev => ({
        ...prev,
        w: k === 'w' || k === 'arrowup'    ? false : prev.w,
        s: k === 's' || k === 'arrowdown'  ? false : prev.s,
        a: k === 'a' || k === 'arrowleft'  ? false : prev.a,
        d: k === 'd' || k === 'arrowright' ? false : prev.d,
      }));
    };

    window.addEventListener('mousedown', down);
    window.addEventListener('mouseup',   up);
    window.addEventListener('keydown',   kdown);
    window.addEventListener('keyup',     kup);
    return () => {
      window.removeEventListener('mousedown', down);
      window.removeEventListener('mouseup',   up);
      window.removeEventListener('keydown',   kdown);
      window.removeEventListener('keyup',     kup);
    };
  }, []);

  return (
    <div className="absolute bottom-4 right-4 bg-stone-900/85 backdrop-blur-sm rounded-2xl px-3 py-3 border border-stone-700/50 shadow-xl pointer-events-none select-none w-44">
      <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest mb-2.5">
        {mode === '3d' ? 'Kontrol 3D' : 'Kontrol Walk'}
      </p>

      {mode === '3d' && (
        <div className="flex gap-3 items-start">
          <MouseIcon left={p.left} right={p.right} scroll={p.scroll} />
          <div className="flex flex-col gap-1.5 pt-0.5 text-[10px] text-stone-400 leading-tight">
            <div className={cn('transition-colors duration-75', p.left && 'text-white')}>
              <span className="font-medium">Kiri</span> — Orbit
            </div>
            <div className={cn('transition-colors duration-75', p.right && 'text-white')}>
              <span className="font-medium">Kanan</span> — Geser
            </div>
            <div className={cn('transition-colors duration-75', p.scroll && 'text-white')}>
              <span className="font-medium">Scroll</span> — Zoom
            </div>
            <div className="border-t border-stone-700 pt-1.5 mt-0.5 text-stone-500">
              Klik objek → Pilih
            </div>
          </div>
        </div>
      )}

      {mode === 'walk' && walkActive && (
        <div className="flex flex-col gap-2.5">
          {/* Mouse */}
          <div className="flex gap-3 items-start">
            <MouseIcon left={p.left} right={false} scroll={false} />
            <div className="flex flex-col gap-1 pt-1 text-[10px] text-stone-400">
              <div className={cn('transition-colors duration-75', p.left && 'text-white')}>
                <span className="font-medium">Tahan kiri</span>
                <br />+ gerak → Lihat
              </div>
            </div>
          </div>

          {/* WASD */}
          <div className="border-t border-stone-700 pt-2">
            <p className="text-[9px] text-stone-500 mb-1.5">Gerak</p>
            <div className="flex flex-col items-center gap-1">
              <Key label="W" active={p.w} />
              <div className="flex gap-1">
                <Key label="A" active={p.a} />
                <Key label="S" active={p.s} />
                <Key label="D" active={p.d} />
              </div>
            </div>
            <p className="text-[9px] text-stone-500 mt-1.5 text-center">atau tombol ↑↓←→</p>
          </div>

          <div className="border-t border-stone-700 pt-1.5">
            <p className="text-[9px] text-stone-500">
              <kbd className="bg-stone-700 text-stone-300 px-1 py-0.5 rounded text-[9px]">Esc</kbd>
              {' '}→ Keluar walk
            </p>
          </div>
        </div>
      )}

      {mode === 'walk' && !walkActive && (
        <div className="text-[10px] text-stone-400 text-center py-1">
          Klik canvas untuk<br />masuk ke ruangan
        </div>
      )}
    </div>
  );
}
