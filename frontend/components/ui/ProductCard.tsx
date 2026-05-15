'use client';
import Image from 'next/image';
import Link from 'next/link';
import { Plus, Eye } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import Button from './Button';

interface ProductCardProps {
  product: {
    id: number;
    name: string;
    category: string;
    price: number;
    thumbnail: string;
    dimensions?: { width?: number; depth?: number; height?: number };
  };
  onAddToRoom?: (product: ProductCardProps['product']) => void;
  compact?: boolean;
}

export default function ProductCard({ product, onAddToRoom, compact }: ProductCardProps) {
  return (
    <div className="group bg-white rounded-xl border border-stone-100 overflow-hidden hover:shadow-md hover:border-stone-200 transition-all duration-200">
      <div className="relative aspect-square bg-stone-50 overflow-hidden">
        <Image
          src={product.thumbnail || '/placeholder-product.jpg'}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
          loading="lazy"
          placeholder="blur"
          blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2Y1ZjVmNCIvPjwvc3ZnPg=="
        />
        <span className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-stone-600 text-xs font-medium px-2 py-0.5 rounded-full capitalize">
          {product.category}
        </span>
        {onAddToRoom && (
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              onClick={() => onAddToRoom(product)}
              className="bg-white text-stone-800 rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-1.5 hover:bg-stone-100 transition-colors shadow"
            >
              <Plus size={14} /> Taruh di Ruangan
            </button>
          </div>
        )}
      </div>

      <div className="p-3">
        <p className="text-sm font-medium text-stone-800 line-clamp-2 leading-snug">{product.name}</p>
        {!compact && product.dimensions && (
          <p className="text-xs text-stone-400 mt-1">
            {product.dimensions.width}×{product.dimensions.depth}×{product.dimensions.height} cm
          </p>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm font-semibold text-stone-900">{formatPrice(product.price)}</span>
          <Link href={`/product/${product.id}`}>
            <button className="text-stone-400 hover:text-stone-700 p-1 rounded transition-colors">
              <Eye size={16} />
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
