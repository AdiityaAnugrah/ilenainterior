'use client';
import { useEffect, useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { Plus, Search, Pencil, Trash2, Box, Image as ImageIcon, Package, Power, Copy, Eye, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ?? 'http://localhost:5000';

interface Product {
  id: number; sku: string; name: string; category: string;
  price: number; thumbnail: string | null; model_3d: string | null;
  stock: number; is_active: number; variant_count: number;
  description?: string; dimensions?: any; tags?: string[];
}

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

function ConfirmationDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isLoading,
}: ConfirmationDialogProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onCancel();
      }
    };
    const handleEnter = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && isOpen && !isLoading) {
        onConfirm();
      }
    };
    window.addEventListener('keydown', handleEscape);
    window.addEventListener('keydown', handleEnter);
    return () => {
      window.removeEventListener('keydown', handleEscape);
      window.removeEventListener('keydown', handleEnter);
    };
  }, [isOpen, isLoading, onCancel, onConfirm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl">
        <h3 className="text-lg font-semibold text-stone-900 mb-2">{title}</h3>
        <p className="text-stone-600 text-sm mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium bg-stone-800 text-white hover:bg-stone-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading && <Loader2 size={14} className="animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

interface EditableStockCellProps {
  productId: number;
  initialStock: number;
  onUpdate: (productId: number, newStock: number) => Promise<void>;
  isLoading: boolean;
}

function EditableStockCell({ productId, initialStock, onUpdate, isLoading }: EditableStockCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(String(initialStock));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(String(initialStock));
  }, [initialStock]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    const trimmed = value.trim();
    if (trimmed === '') {
      toast.error('Stock must be a valid number');
      setValue(String(initialStock));
      setIsEditing(false);
      return;
    }

    const parsed = parseInt(trimmed, 10);
    if (isNaN(parsed)) {
      toast.error('Stock must be a valid number');
      setValue(String(initialStock));
      setIsEditing(false);
      return;
    }

    if (parsed === initialStock) {
      setIsEditing(false);
      return;
    }

    try {
      await onUpdate(productId, parsed);
      setIsEditing(false);
    } catch (error) {
      setValue(String(initialStock));
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setValue(String(initialStock));
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
        className="w-16 px-2 py-1 text-xs font-medium text-center border border-stone-300 rounded focus:outline-none focus:border-stone-500 disabled:opacity-50"
      />
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      disabled={isLoading}
      className={`text-xs font-medium cursor-pointer hover:underline disabled:cursor-not-allowed ${
        initialStock > 0 ? 'text-green-600' : 'text-red-500'
      }`}
      title="Click to edit"
    >
      {isLoading ? <Loader2 size={12} className="animate-spin inline" /> : initialStock}
    </button>
  );
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [total, setTotal]       = useState(0);
  const [loadingProductIds, setLoadingProductIds] = useState<Set<number>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    productId: number | null;
    action: 'activate' | 'deactivate' | null;
    productName: string;
  }>({ isOpen: false, productId: null, action: null, productName: '' });
  const [dialogLoading, setDialogLoading] = useState(false);

  const requestQueue = useRef<Promise<any>>(Promise.resolve());

  const queueRequest = async <T,>(fn: () => Promise<T>): Promise<T> => {
    const promise = requestQueue.current.then(fn, fn);
    requestQueue.current = promise.catch(() => {});
    return promise;
  };

  const setProductLoading = (productId: number, isLoading: boolean) => {
    setLoadingProductIds(prev => {
      const next = new Set(prev);
      if (isLoading) {
        next.add(productId);
      } else {
        next.delete(productId);
      }
      return next;
    });
  };

  const handleApiError = (error: any, action: string, productId: number) => {
    console.error(`[Quick Actions] ${action} failed for product ${productId}:`, {
      error: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });

    if (!error.response) {
      return 'Network error. Please check your connection.';
    }

    switch (error.response.status) {
      case 404:
        return 'Product not found';
      case 401:
      case 403:
        return 'Unauthorized. Please log in again.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return error.response.data?.message || 'An error occurred';
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/admin/products', { params: { search, limit: 50 } });
      setProducts(data.data);
      setTotal(data.total);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Hapus produk "${name}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    try {
      await api.delete(`/api/admin/products/${id}`);
      toast.success('Produk dihapus');
      load();
    } catch { toast.error('Gagal menghapus produk'); }
  };

  const handleToggleStatus = (product: Product) => {
    const action = product.is_active ? 'deactivate' : 'activate';
    setConfirmDialog({
      isOpen: true,
      productId: product.id,
      action,
      productName: product.name,
    });
  };

  const confirmToggleStatus = async () => {
    if (!confirmDialog.productId) return;

    const product = products.find(p => p.id === confirmDialog.productId);
    if (!product) return;

    const newStatus = product.is_active ? 0 : 1;
    const oldStatus = product.is_active;

    setDialogLoading(true);

    // Optimistic update
    setProducts(prev => prev.map(p =>
      p.id === product.id ? { ...p, is_active: newStatus } : p
    ));

    try {
      await queueRequest(() =>
        api.put(`/api/admin/products/${product.id}`, {
          name: product.name,
          category: product.category,
          description: product.description || '',
          price: product.price,
          width: product.dimensions?.width || 0,
          depth: product.dimensions?.depth || 0,
          height: product.dimensions?.height || 0,
          tags: product.tags?.join(',') || '',
          stock: product.stock,
          is_active: newStatus,
        })
      );

      toast.success('Product status updated');
      setConfirmDialog({ isOpen: false, productId: null, action: null, productName: '' });
      setDialogLoading(false);
      load(); // Refresh to ensure consistency
    } catch (error) {
      // Revert optimistic update
      setProducts(prev => prev.map(p =>
        p.id === product.id ? { ...p, is_active: oldStatus } : p
      ));
      const errorMsg = handleApiError(error, 'Toggle Status', product.id);
      toast.error(errorMsg);
      setDialogLoading(false);
    }
  };

  const cancelToggleStatus = () => {
    if (!dialogLoading) {
      setConfirmDialog({ isOpen: false, productId: null, action: null, productName: '' });
    }
  };

  const handleDuplicate = async (product: Product) => {
    setProductLoading(product.id, true);

    try {
      // Fetch complete product details
      const { data: fullProduct } = await queueRequest(() =>
        api.get(`/api/admin/products/${product.id}`)
      );

      // Transform data for duplication
      const duplicateData = {
        sku: fullProduct.sku + '-COPY',
        name: fullProduct.name + ' (Copy)',
        category: fullProduct.category,
        description: fullProduct.description || '',
        price: fullProduct.price,
        width: fullProduct.dimensions?.width || 0,
        depth: fullProduct.dimensions?.depth || 0,
        height: fullProduct.dimensions?.height || 0,
        tags: fullProduct.tags?.join(',') || '',
        stock: fullProduct.stock,
        is_active: 0, // Always inactive
      };

      // Create duplicate
      await queueRequest(() => api.post('/api/admin/products', duplicateData));

      toast.success('Product duplicated successfully');
      load(); // Refresh to show new product
    } catch (error) {
      const errorMsg = handleApiError(error, 'Duplicate Product', product.id);
      toast.error(errorMsg);
    } finally {
      setProductLoading(product.id, false);
    }
  };

  const handlePreview = (product: Product) => {
    const clientUrl = process.env.NEXT_PUBLIC_CLIENT_URL || 'http://localhost:3000';
    const previewUrl = `${clientUrl}/products/${product.id}`;
    window.open(previewUrl, '_blank');
  };

  const handleStockUpdate = async (productId: number, newStock: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const oldStock = product.stock;

    setProductLoading(productId, true);

    // Optimistic update
    setProducts(prev => prev.map(p =>
      p.id === productId ? { ...p, stock: newStock } : p
    ));

    try {
      await queueRequest(() =>
        api.put(`/api/admin/products/${productId}`, {
          name: product.name,
          category: product.category,
          description: product.description || '',
          price: product.price,
          width: product.dimensions?.width || 0,
          depth: product.dimensions?.depth || 0,
          height: product.dimensions?.height || 0,
          tags: product.tags?.join(',') || '',
          stock: newStock,
          is_active: product.is_active,
        })
      );

      toast.success(`Stock updated to ${newStock}`);
      load(); // Refresh to ensure consistency
    } catch (error) {
      // Revert optimistic update
      setProducts(prev => prev.map(p =>
        p.id === productId ? { ...p, stock: oldStock } : p
      ));
      const errorMsg = handleApiError(error, 'Stock Update', productId);
      toast.error(errorMsg);
    } finally {
      setProductLoading(productId, false);
    }
  };

  return (
    <div className="p-8">
      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.action === 'activate' ? 'Activate Product?' : 'Deactivate Product?'}
        message={`Are you sure you want to ${confirmDialog.action} "${confirmDialog.productName}"?`}
        confirmText="Confirm"
        cancelText="Cancel"
        onConfirm={confirmToggleStatus}
        onCancel={cancelToggleStatus}
        isLoading={dialogLoading}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Produk</h1>
          <p className="text-stone-500 text-sm mt-1">{total} produk total</p>
        </div>
        <Link
          href="/admin/products/new"
          className="flex items-center gap-2 bg-stone-800 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-stone-700 transition-colors"
        >
          <Plus size={16} /> Tambah Produk
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama atau SKU..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-stone-400 bg-white"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 border-b border-stone-100">
            <tr>
              <th className="text-left px-5 py-3.5 text-xs font-semibold text-stone-500 uppercase tracking-wide">Produk</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-stone-500 uppercase tracking-wide">SKU</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-stone-500 uppercase tracking-wide">Kategori</th>
              <th className="text-right px-4 py-3.5 text-xs font-semibold text-stone-500 uppercase tracking-wide">Harga</th>
              <th className="text-center px-4 py-3.5 text-xs font-semibold text-stone-500 uppercase tracking-wide">Stok</th>
              <th className="text-center px-4 py-3.5 text-xs font-semibold text-stone-500 uppercase tracking-wide">Asset</th>
              <th className="text-center px-4 py-3.5 text-xs font-semibold text-stone-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-5 py-4"><div className="h-4 bg-stone-100 rounded animate-pulse w-40" /></td>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-4"><div className="h-4 bg-stone-100 rounded animate-pulse w-16 mx-auto" /></td>
                  ))}
                  <td />
                </tr>
              ))
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-16 text-stone-400">
                  <Package size={32} className="mx-auto mb-2 opacity-30" />
                  <p>Belum ada produk. <Link href="/admin/products/new" className="text-stone-600 underline">Tambah sekarang</Link></p>
                </td>
              </tr>
            ) : products.map((p) => {
              const isProductLoading = loadingProductIds.has(p.id);
              return (
                <tr key={p.id} className="hover:bg-stone-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                        {p.thumbnail ? (
                          <Image
                            src={p.thumbnail}
                            alt={p.name}
                            fill
                            className="object-cover"
                            sizes="40px"
                            loading="lazy"
                            placeholder="blur"
                            blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjZjVmNWY0Ii8+PC9zdmc+"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-stone-300">
                            <ImageIcon size={16} />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-stone-800">{p.name}</p>
                        <p className="text-xs text-stone-400">{p.variant_count} varian</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-stone-500 font-mono text-xs">{p.sku}</td>
                  <td className="px-4 py-4 capitalize text-stone-600">{p.category}</td>
                  <td className="px-4 py-4 text-right font-medium text-stone-800">{formatPrice(p.price)}</td>
                  <td className="px-4 py-4 text-center">
                    <EditableStockCell
                      productId={p.id}
                      initialStock={p.stock}
                      onUpdate={handleStockUpdate}
                      isLoading={isProductLoading}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <span title="Foto" className={`text-xs px-1.5 py-0.5 rounded ${p.thumbnail ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-400'}`}>
                        Foto
                      </span>
                      <span title="Model 3D" className={`text-xs px-1.5 py-0.5 rounded flex items-center gap-0.5 ${p.model_3d ? 'bg-blue-100 text-blue-700' : 'bg-stone-100 text-stone-400'}`}>
                        <Box size={10} /> 3D
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'}`}>
                      {p.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      {/* Toggle Status Button */}
                      <button
                        onClick={() => handleToggleStatus(p)}
                        disabled={isProductLoading}
                        className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title={p.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {isProductLoading ? <Loader2 size={16} className="animate-spin" /> : <Power size={16} />}
                      </button>

                      {/* Duplicate Button */}
                      <button
                        onClick={() => handleDuplicate(p)}
                        disabled={isProductLoading}
                        className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Duplicate product"
                      >
                        {isProductLoading ? <Loader2 size={16} className="animate-spin" /> : <Copy size={16} />}
                      </button>

                      {/* Preview Button */}
                      <button
                        onClick={() => handlePreview(p)}
                        disabled={isProductLoading}
                        className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Preview on frontend"
                      >
                        <Eye size={16} />
                      </button>

                      {/* Edit Button */}
                      <Link
                        href={`/admin/products/${p.id}`}
                        className={`p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-all ${isProductLoading ? 'pointer-events-none opacity-50' : ''}`}
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </Link>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        disabled={isProductLoading}
                        className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Hapus"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
