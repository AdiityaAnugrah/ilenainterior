import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatPrice(price: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(price);
}

export function formatDimensions(d: { width?: number; depth?: number; height?: number }) {
  if (!d) return '-';
  return `${d.width ?? 0} × ${d.depth ?? 0} × ${d.height ?? 0} cm`;
}
