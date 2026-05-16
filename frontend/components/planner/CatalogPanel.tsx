'use client';
import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { cn, formatPrice } from '@/lib/utils';
import api from '@/lib/api';
import Image from 'next/image';

const CATEGORIES = [
  { value: 'all',      label: 'Semua' },
  { value: 'sofa',     label: 'Sofa' },
  { value: 'meja',     label: 'Meja' },
  { value: 'kursi',    label: 'Kursi' },
  { value: 'rak',      label: 'Rak' },
  { value: 'lampu',    label: 'Lampu' },
  { value: 'dekorasi', label: 'Dekorasi' },
  { value: 'aksesori', label: '✨ Aksesori' },
];

const FREE_ACCESSORIES: Product[] = [
  { id: -1,  name: 'Vas Bunga',        category: 'aksesori', price: 0, thumbnail: '', dimensions: { width: 20,  depth: 20,  height: 35 } },
  { id: -2,  name: 'Tanaman Pot Kecil',category: 'aksesori', price: 0, thumbnail: '', dimensions: { width: 25,  depth: 25,  height: 45 } },
  { id: -3,  name: 'Tanaman Pot Besar',category: 'aksesori', price: 0, thumbnail: '', dimensions: { width: 45,  depth: 45,  height: 90 } },
  { id: -4,  name: 'Lilin Dekorasi',   category: 'aksesori', price: 0, thumbnail: '', dimensions: { width: 8,   depth: 8,   height: 15 } },
  { id: -5,  name: 'Bingkai Foto S',   category: 'aksesori', price: 0, thumbnail: '', dimensions: { width: 25,  depth: 5,   height: 30 } },
  { id: -6,  name: 'Bingkai Foto L',   category: 'aksesori', price: 0, thumbnail: '', dimensions: { width: 60,  depth: 5,   height: 80 } },
  { id: -7,  name: 'Patung Kecil',     category: 'aksesori', price: 0, thumbnail: '', dimensions: { width: 15,  depth: 15,  height: 25 } },
  { id: -8,  name: 'Karpet Bundar',    category: 'aksesori', price: 0, thumbnail: '', dimensions: { width: 150, depth: 150, height: 2  } },
  { id: -9,  name: 'Bantal Sofa',      category: 'aksesori', price: 0, thumbnail: '', dimensions: { width: 45,  depth: 45,  height: 15 } },
  { id: -10, name: 'Lampu Meja',       category: 'aksesori', price: 0, thumbnail: '', dimensions: { width: 25,  depth: 25,  height: 50 } },
  { id: -11, name: 'Cermin Bulat',     category: 'aksesori', price: 0, thumbnail: '', dimensions: { width: 60,  depth: 5,   height: 60 } },
  { id: -12, name: 'Jam Dinding',      category: 'aksesori', price: 0, thumbnail: '', dimensions: { width: 30,  depth: 5,   height: 30 } },
];

const ACCESSORY_EMOJI: Record<string, string> = {
  'Vas Bunga':         '🏺',
  'Tanaman Pot Kecil': '🌿',
  'Tanaman Pot Besar': '🌳',
  'Lilin Dekorasi':    '🕯️',
  'Bingkai Foto S':    '🖼️',
  'Bingkai Foto L':    '🖼️',
  'Patung Kecil':      '🗿',
  'Karpet Bundar':     '⭕',
  'Bantal Sofa':       '🛋️',
  'Lampu Meja':        '💡',
  'Cermin Bulat':      '🪞',
  'Jam Dinding':       '🕐',
};

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  thumbnail: string;
  dimensions: { width: number; depth: number; height: number };
}

interface CatalogPanelProps {
  onDragStart: (product: Product, e: React.DragEvent) => void;
  onAddProduct: (product: Product) => void;
}

export default function CatalogPanel({ onDragStart, onAddProduct }: CatalogPanelProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params: Record<string, string> = { limit: '50' };
        if (search) params.search = search;
        if (category !== 'all') params.category = category;
        const { data } = await api.get('/api/products', { params });
        setProducts(data.data || []);
      } catch {
        // fallback ke mock data kalau backend belum jalan
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    const t = setTimeout(fetchProducts, 300);
    return () => clearTimeout(t);
  }, [search, category]);

  return (
    <div className="w-72 shrink-0 bg-white border-r border-stone-200 flex flex-col overflow-hidden">
      {/* Search */}
      <div className="p-3 border-b border-stone-100">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari produk..."
            className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-stone-200 focus:border-stone-400 focus:outline-none bg-stone-50"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X size={12} className="text-stone-400" />
            </button>
          )}
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-1 p-2 flex-wrap border-b border-stone-100">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setCategory(cat.value)}
            className={cn(
              'px-2 py-0.5 rounded-full text-[11px] font-medium transition-all',
              category === cat.value
                ? 'bg-stone-800 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Product grid */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* Aksesori gratis tab */}
        {category === 'aksesori' ? (
          <>
            <p className="text-[10px] text-stone-400 mb-2 px-0.5">Gratis · bisa ditaruh di mana saja</p>
            <div className="grid grid-cols-2 gap-2">
              {FREE_ACCESSORIES.map((acc) => (
                <div
                  key={acc.id}
                  draggable
                  onDragStart={(e) => onDragStart(acc, e)}
                  onClick={() => onAddProduct(acc)}
                  className="cursor-grab active:cursor-grabbing bg-amber-50 rounded-lg overflow-hidden border border-amber-100 hover:border-amber-300 hover:shadow-sm transition-all"
                  title={`${acc.name} — drag atau klik untuk taruh`}
                >
                  <div className="aspect-square flex items-center justify-center text-3xl bg-amber-50">
                    {ACCESSORY_EMOJI[acc.name] ?? '🎨'}
                  </div>
                  <div className="p-1.5">
                    <p className="text-[10px] font-medium text-stone-700 line-clamp-2 leading-tight">{acc.name}</p>
                    <p className="text-[10px] text-amber-600 font-semibold mt-0.5">GRATIS</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : loading ? (
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-lg bg-stone-100 animate-pulse" />
            ))}
          </div>
        ) : !products || products.length === 0 ? (
          <div className="text-center py-8 text-stone-400 text-xs">
            <p>Produk tidak ditemukan</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              {products?.map((product) => (
                <div
                  key={product.id}
                  draggable
                  onDragStart={(e) => onDragStart(product, e)}
                  onClick={() => onAddProduct(product)}
                  className="group cursor-grab active:cursor-grabbing bg-stone-50 rounded-lg overflow-hidden border border-stone-100 hover:border-stone-300 hover:shadow-sm transition-all"
                  title={`${product.name} — drag atau klik untuk taruh`}
                >
                  <div className="relative aspect-square">
                    <Image
                      src={product.thumbnail || '/placeholder-product.jpg'}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="150px"
                      loading="lazy"
                      placeholder="blur"
                      blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y1ZjVmNCIvPjwvc3ZnPg=="
                    />
                  </div>
                  <div className="p-1.5">
                    <p className="text-[10px] font-medium text-stone-700 line-clamp-2 leading-tight">
                      {product.name}
                    </p>
                    <p className="text-[10px] text-stone-500 mt-0.5">{formatPrice(product.price)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Aksesori gratis section at bottom of 'all' */}
            {category === 'all' && (
              <div className="mt-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-px flex-1 bg-stone-100" />
                  <p className="text-[10px] text-stone-400 font-medium">✨ Aksesori Gratis</p>
                  <div className="h-px flex-1 bg-stone-100" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {FREE_ACCESSORIES.map((acc) => (
                    <div
                      key={acc.id}
                      draggable
                      onDragStart={(e) => onDragStart(acc, e)}
                      onClick={() => onAddProduct(acc)}
                      className="cursor-grab active:cursor-grabbing bg-amber-50 rounded-lg overflow-hidden border border-amber-100 hover:border-amber-300 hover:shadow-sm transition-all"
                      title={`${acc.name} — drag atau klik untuk taruh`}
                    >
                      <div className="aspect-square flex items-center justify-center text-3xl bg-amber-50">
                        {ACCESSORY_EMOJI[acc.name] ?? '🎨'}
                      </div>
                      <div className="p-1.5">
                        <p className="text-[10px] font-medium text-stone-700 line-clamp-2 leading-tight">{acc.name}</p>
                        <p className="text-[10px] text-amber-600 font-semibold mt-0.5">GRATIS</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
