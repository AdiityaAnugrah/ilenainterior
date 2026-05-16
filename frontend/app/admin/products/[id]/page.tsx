'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import ProductForm from '@/components/admin/ProductForm';

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/admin/products/${id}`)
      .then(r => setProduct(r.data))
      .catch(() => router.push('/admin/products'))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-64">
      <div className="w-6 h-6 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-900">Edit Produk</h1>
        <p className="text-stone-500 text-sm mt-1">{product?.name}</p>
      </div>
      <ProductForm mode="edit" initialData={product} />
    </div>
  );
}
