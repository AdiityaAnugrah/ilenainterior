'use client';
import { useEffect, useState } from 'react';

// Breakpoint default mengikuti Tailwind `md` (768px). Layar < breakpoint
// dianggap "mobile" untuk keperluan layout (drawer/bottom-sheet, dsb).
const DEFAULT_BREAKPOINT = 768;

/**
 * useIsMobile — true bila lebar viewport < breakpoint.
 *
 * Sengaja mulai `false` di server & render pertama klien supaya tidak terjadi
 * hydration mismatch; nilai sebenarnya dihitung setelah mount via matchMedia.
 */
export function useIsMobile(breakpointPx: number = DEFAULT_BREAKPOINT): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpointPx - 0.02}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [breakpointPx]);

  return isMobile;
}

/**
 * useHasTouch — true bila perangkat mendukung input sentuh. Berguna untuk
 * menentukan skema kontrol (mis. joystick walk-through vs keyboard).
 */
export function useHasTouch(): boolean {
  const [hasTouch, setHasTouch] = useState(false);

  useEffect(() => {
    const detect = () =>
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(pointer: coarse)').matches;
    setHasTouch(detect());
  }, []);

  return hasTouch;
}
