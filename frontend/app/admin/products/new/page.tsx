import ProductForm from '@/components/admin/ProductForm';

export default function NewProductPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-900">Tambah Produk</h1>
        <p className="text-stone-500 text-sm mt-1">Upload foto & model 3D produk kamu</p>
      </div>
      <ProductForm mode="new" />
    </div>
  );
}
