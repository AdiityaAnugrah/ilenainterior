'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ShoppingCart, Layers, Ruler } from 'lucide-react';
import { formatPrice, formatDimensions } from '@/lib/utils';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';

interface Variant { id: number; name: string; color: string; stock: number; }
interface Product {
  id: number; sku: string; name: string; category: string;
  description: string; price: number;
  dimensions: { width: number; depth: number; height: number };
  thumbnail: string; tags: string[]; stock: number;
  variants: Variant[];
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get(`/products/${id}`);
        setProduct(data);
        if (data.variants?.length > 0) setSelectedVariant(data.variants[0]);
      } catch {
        router.push('/catalog');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id, router]);

  const handleAddToRoom = () => {
    if (!product) return;
    toast.success(`${product.name} siap ditaruh — buka Planner`);
    router.push('/planner');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-stone-400 text-sm animate-pulse">Memuat produk...</div>
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-stone-100">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="font-display text-lg font-semibold text-stone-900 tracking-wide">
            ILENA INTERIOR
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/catalog" className="text-sm text-stone-500 hover:text-stone-700 transition-colors">
              Katalog
            </Link>
            <Link href="/planner" className="bg-stone-800 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-stone-700 transition-colors">
              Planner
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-stone-400 mb-6">
          <Link href="/" className="hover:text-stone-600 transition-colors">Beranda</Link>
          <span>/</span>
          <Link href="/catalog" className="hover:text-stone-600 transition-colors">Katalog</Link>
          <span>/</span>
          <span className="capitalize text-stone-600">{product.category}</span>
          <span>/</span>
          <span className="text-stone-700 font-medium">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Image */}
          <div className="space-y-3">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-stone-100">
              <Image
                src={product.thumbnail || '/placeholder-product.jpg'}
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
                placeholder="blur"
                blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjgwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjgwMCIgZmlsbD0iI2Y1ZjVmNCIvPjwvc3ZnPg=="
              />
              <span className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm text-stone-700 text-xs font-semibold px-3 py-1 rounded-full capitalize">
                {product.category}
              </span>
            </div>
          </div>

          {/* Info */}
          <div className="flex flex-col gap-5">
            <div>
              <p className="text-xs text-stone-400 font-mono mb-1">SKU: {product.sku}</p>
              <h1 className="font-display text-3xl font-bold text-stone-900 leading-tight mb-2">
                {product.name}
              </h1>
              <p className="text-2xl font-bold text-stone-800">{formatPrice(product.price)}</p>
            </div>

            <p className="text-stone-600 leading-relaxed text-sm">{product.description}</p>

            {/* Dimensions */}
            <div className="bg-stone-50 rounded-xl p-4 flex items-center gap-3">
              <Ruler size={18} className="text-stone-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-stone-400 font-medium mb-0.5">Dimensi (L × P × T)</p>
                <p className="text-sm font-medium text-stone-700">{formatDimensions(product.dimensions)}</p>
              </div>
            </div>

            {/* Variants */}
            {product.variants.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-stone-700 mb-2">
                  Pilih Warna
                  {selectedVariant && <span className="font-normal text-stone-400 ml-2">— {selectedVariant.name}</span>}
                </p>
                <div className="flex gap-2 flex-wrap">
                  {product.variants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(v)}
                      title={v.name}
                      className={cn(
                        'w-8 h-8 rounded-full border-2 transition-all',
                        selectedVariant?.id === v.id
                          ? 'border-stone-800 scale-110 shadow-md'
                          : 'border-transparent hover:border-stone-400'
                      )}
                      style={{ backgroundColor: v.color || '#ccc' }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Stock */}
            <p className="text-xs text-stone-400">
              {product.stock > 0 ? (
                <span className="text-green-600 font-medium">● Stok tersedia ({product.stock} unit)</span>
              ) : (
                <span className="text-red-500 font-medium">● Stok habis</span>
              )}
            </p>

            {/* Tags */}
            {product.tags?.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {product.tags.map((tag) => (
                  <span key={tag} className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full capitalize">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* CTAs */}
            <div className="flex flex-col gap-3 pt-2">
              <Button onClick={handleAddToRoom} size="lg" className="w-full gap-2">
                <Layers size={18} /> Taruh di Ruangan
              </Button>
              <Button variant="outline" size="lg" className="w-full gap-2">
                <ShoppingCart size={18} /> + Keranjang
              </Button>
            </div>

            {/* Back */}
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-600 transition-colors w-fit"
            >
              <ArrowLeft size={14} /> Kembali ke katalog
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
