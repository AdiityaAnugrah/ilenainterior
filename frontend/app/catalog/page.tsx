'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, SlidersHorizontal, X, ArrowRight } from 'lucide-react';
import { cn, formatPrice } from '@/lib/utils';
import api from '@/lib/api';
import ProductCard from '@/components/ui/ProductCard';

const CATEGORIES = [
  { value: 'all', label: 'Semua' },
  { value: 'sofa', label: 'Sofa' },
  { value: 'meja', label: 'Meja' },
  { value: 'kursi', label: 'Kursi' },
  { value: 'rak', label: 'Rak' },
  { value: 'lampu', label: 'Lampu' },
  { value: 'dekorasi', label: 'Dekorasi' },
];

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  thumbnail: string;
  dimensions: { width: number; depth: number; height: number };
}

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('created_at');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const params: Record<string, string> = { page: String(page), limit: '20', sort };
        if (search) params.search = search;
        if (category !== 'all') params.category = category;
        const { data } = await api.get('/api/products', { params });
        setProducts(data.data);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    const t = setTimeout(fetch, 300);
    return () => clearTimeout(t);
  }, [search, category, sort, page]);

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-stone-100">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="font-display text-lg font-semibold text-stone-900 tracking-wide whitespace-nowrap">
            ILENA INTERIOR
          </Link>
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Cari furniture, dekorasi..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-stone-200 bg-stone-50 focus:bg-white focus:border-stone-400 focus:outline-none transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X size={14} className="text-stone-400" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="text-sm border border-stone-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-stone-400"
            >
              <option value="created_at">Terbaru</option>
              <option value="price">Harga: Terendah</option>
              <option value="name">Nama A-Z</option>
            </select>
            <Link
              href="/planner"
              className="bg-stone-800 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-stone-700 transition-colors whitespace-nowrap flex items-center gap-1.5"
            >
              Mulai Desain <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-6 flex gap-6">
        {/* Sidebar filter */}
        <aside className="w-48 flex-shrink-0">
          <div className="bg-white rounded-xl border border-stone-100 p-4 sticky top-20">
            <h3 className="text-sm font-semibold text-stone-700 mb-3 flex items-center gap-2">
              <SlidersHorizontal size={14} /> Filter
            </h3>
            <div className="flex flex-col gap-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => { setCategory(cat.value); setPage(1); }}
                  className={cn(
                    'text-left px-3 py-2 rounded-lg text-sm transition-all',
                    category === cat.value
                      ? 'bg-stone-800 text-white font-medium'
                      : 'text-stone-600 hover:bg-stone-100'
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Product grid */}
        <main className="flex-1">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-stone-500">
              {loading ? 'Memuat...' : `${total} produk ditemukan`}
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="rounded-xl bg-white border border-stone-100 overflow-hidden">
                  <div className="aspect-square bg-stone-100 animate-pulse" />
                  <div className="p-3 space-y-2">
                    <div className="h-4 bg-stone-100 rounded animate-pulse" />
                    <div className="h-3 bg-stone-100 rounded w-2/3 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-stone-400">
              <p className="text-5xl mb-4">🔍</p>
              <p className="font-medium text-stone-600">Produk tidak ditemukan</p>
              <p className="text-sm mt-1">Coba ubah filter atau kata kunci pencarian</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-8">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="px-4 py-2 rounded-lg border border-stone-200 text-sm text-stone-600 disabled:opacity-40 hover:bg-stone-50 transition-colors"
                  >
                    ← Prev
                  </button>
                  <span className="px-4 py-2 text-sm text-stone-500">
                    {page} / {totalPages}
                  </span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    className="px-4 py-2 rounded-lg border border-stone-200 text-sm text-stone-600 disabled:opacity-40 hover:bg-stone-50 transition-colors"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
