'use client';

import React, { useState, useRef } from 'react';
import { useProductsQuery, useCategoriesQuery, useCreateProductMutation, useDeleteProductMutation } from '../../../hooks/useProducts';
import { 
  useRestoreProductMutation, 
  useToggleFeaturedMutation, 
  useBulkFeatureMutation, 
  useBulkArchiveMutation, 
  useBulkRestoreMutation
} from '../../../hooks/useAdmin';
import { X, Loader2, Upload, Trash2, RefreshCcw, Star, StarOff, AlertCircle, Edit, CheckSquare, Square, Trash } from 'lucide-react';
import { Product } from '../../../types/index';
import { SafeImage } from '../../../components/SafeImage';
import { apiClient } from '../../../lib/api-client';
import { useToast } from '../../../providers/ToastProvider';
import { useTranslation } from '../../../providers/I18nProvider';
import { useCurrency } from '../../../providers/CurrencyProvider';

export default function AdminProductsPage() {
  const { showToast } = useToast();
  const { locale, t } = useTranslation();
  const { formatPrice } = useCurrency();
  
  // Queries
  const { data: products = [], isLoading, refetch } = useProductsQuery({ includeDeleted: true });
  const { data: categories = [] } = useCategoriesQuery();

  // Mutations
  const createProductMutation = useCreateProductMutation();
  const deleteProductMutation = useDeleteProductMutation();
  const restoreProductMutation = useRestoreProductMutation();
  const toggleFeaturedMutation = useToggleFeaturedMutation();
  const bulkFeatureMutation = useBulkFeatureMutation();
  const bulkArchiveMutation = useBulkArchiveMutation();
  const bulkRestoreMutation = useBulkRestoreMutation();

  // State management
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [imagePreview, setImagePreview] = useState<string>('');

  // Form Fields
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState('');
  const [compareAtPrice, setCompareAtPrice] = useState('');
  const [description, setDescription] = useState('');
  const [sizes, setSizes] = useState<string[]>([]);
  const [colors, setColors] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form fields for create or edit
  const openCreateModal = () => {
    setEditingProduct(null);
    setName('');
    setCategoryId('');
    setPrice('');
    setCompareAtPrice('');
    setDescription('');
    setSizes([]);
    setColors('');
    setImageUrl('');
    setImagePreview('');
    setIsFeatured(false);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setName(product.name);
    
    // Map category slug back to category ID
    const cat = categories.find(c => c.slug === product.category);
    setCategoryId(cat ? cat.id : '');

    setPrice(product.price.toString());
    setCompareAtPrice(product.compareAtPrice ? product.compareAtPrice.toString() : '');
    setDescription(product.description);
    setSizes(product.sizes || []);
    setColors(product.colors?.join(', ') || '');
    setImageUrl(product.images[0] || '');
    setImagePreview(product.images[0] || '');
    setIsFeatured(product.isFeatured || false);
    setIsCreateModalOpen(true);
  };

  const toggleSize = (size: string) => {
    setSizes(prev =>
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    );
  };

  // Drag and Drop Uploader
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await uploadImageFile(e.target.files[0]);
    }
  };

  const uploadImageFile = async (file: File) => {
    setIsUploading(true);
    setUploadError('');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await apiClient.post('/products/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = response.data.url;
      setImageUrl(url);
      setImagePreview(url);
      showToast(t('adminProducts.toast.uploaded'), 'success');
    } catch (err: any) {
      setUploadError(err.response?.data?.message || t('adminProducts.toast.uploadFailed'));
    } finally {
      setIsUploading(false);
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || !description || !categoryId) {
      showToast(t('adminProducts.toast.fillAll'), 'error');
      return;
    }

    const priceVal = parseFloat(price);
    const comparePriceVal = compareAtPrice ? parseFloat(compareAtPrice) : null;
    const finalImageUrl = imageUrl.trim() || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCh5iPZBcaZFkE2guZE02kCK97ytxbn9EYh_C392OkUlnfg66lEJhQO7WUhZa7LPkrL6mdZacQwdLPSvskKS5GXmAqf0HA5W1ZRRO2jCGGV6OOAthBb8TorMmvwtJZcR00TAde-ewMB_xclXtjV0cF9mQ0dGcN1p6wkASlyJ67VMogUXXGaq2-fFFBZFi9aVZ9u7c1jR280BGqtCuIuo9kUaRKuruhNr94WcOISyZRC4Wv_ceto4GvonrlztHQuuRtCt469SHN0ltwA';

    const payload: any = {
      name,
      description,
      price: priceVal,
      compareAtPrice: comparePriceVal,
      categoryId,
      images: [finalImageUrl],
      sizes: sizes.length > 0 ? sizes : ['S', 'M', 'L', 'XL'],
      colors: colors.split(',').map(c => c.trim()).filter(Boolean),
      isFeatured,
    };

    if (editingProduct) {
      // Execute Edit patch
      try {
        await apiClient.patch(`/products/${editingProduct.id}`, payload);
        refetch();
        showToast(t('adminProducts.toast.updated'), 'success');
        setIsCreateModalOpen(false);
      } catch (err: any) {
        showToast(err.response?.data?.message || t('adminProducts.toast.updateFailed'), 'error');
      }
    } else {
      // Execute Create
      createProductMutation.mutate(payload, {
        onSuccess: () => {
          setIsCreateModalOpen(false);
        }
      });
    }
  };

  // Bulk Actions
  const handleBulkFeature = (featured: boolean) => {
    bulkFeatureMutation.mutate({ ids: selectedIds, isFeatured: featured }, {
      onSuccess: () => setSelectedIds([])
    });
  };

  const handleBulkArchive = () => {
    if (confirm(t('adminProducts.toast.confirmArchive'))) {
      bulkArchiveMutation.mutate(selectedIds, {
        onSuccess: () => setSelectedIds([])
      });
    }
  };

  const handleBulkRestore = () => {
    bulkRestoreMutation.mutate(selectedIds, {
      onSuccess: () => setSelectedIds([])
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === products.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(products.map(p => p.id));
    }
  };

  return (
    <div className="space-y-xl text-left">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-md border-b border-white/5 pb-lg">
        <div>
          <h1 className="font-display-lg text-3xl md:text-5xl text-white uppercase tracking-tight">{t('adminProducts.title')}</h1>
          <p className="text-on-surface-variant text-sm font-sans normal-case mt-sm">
            {t('adminProducts.desc')}
          </p>
        </div>
        <div className="flex gap-sm">
          <button
            onClick={() => refetch()}
            className="px-4 py-3.5 border border-white/10 rounded-lg text-[10px] font-label-caps text-white bg-white/[0.01] hover:bg-white/[0.02]"
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
          <button 
            onClick={openCreateModal}
            className="px-6 py-3.5 bg-white hover:bg-tertiary text-black font-button text-xs uppercase rounded transition-colors"
          >
            {t('adminProducts.addNewProduct')}
          </button>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <section className="bg-tertiary/5 border border-tertiary/10 p-5 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-md animate-fade-in">
          <div>
            <h4 className="font-bold text-white text-xs uppercase">{t('adminProducts.productsSelected', { count: selectedIds.length })}</h4>
            <p className="text-[11px] text-on-surface-variant font-sans normal-case mt-0.5">{t('adminProducts.batchDesc')}</p>
          </div>
          <div className="flex flex-wrap gap-xs">
            <button
              onClick={() => handleBulkFeature(true)}
              className="px-3.5 py-2 border border-tertiary/20 text-tertiary text-[10px] font-label-caps uppercase rounded hover:bg-tertiary/10"
            >
              {t('adminProducts.featureSelected')}
            </button>
            <button
              onClick={() => handleBulkFeature(false)}
              className="px-3.5 py-2 border border-white/10 text-white text-[10px] font-label-caps uppercase rounded hover:bg-white/5"
            >
              {t('adminProducts.unfeature')}
            </button>
            <button
              onClick={handleBulkRestore}
              className="px-3.5 py-2 bg-green-500/10 border border-green-500/20 text-green-500 text-[10px] font-label-caps uppercase rounded hover:bg-green-500/20"
            >
              {t('adminProducts.restoreBulk')}
            </button>
            <button
              onClick={handleBulkArchive}
              className="px-3.5 py-2 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-label-caps uppercase rounded hover:bg-red-500/20"
            >
              {t('adminProducts.archiveBulk')}
            </button>
          </div>
        </section>
      )}

      {/* Catalog Table */}
      <section className="luxury-glass p-6 md:p-8 rounded-xl border border-white/5">
        <h3 className="font-headline-lg text-lg text-white uppercase border-b border-white/5 pb-2">{t('adminProducts.activeCatalogSkus', { count: products.length })}</h3>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 border-2 border-white/10 border-t-tertiary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/5 font-label-caps text-[9px] text-on-surface-variant/50">
                  <th className="py-3 pl-3 w-8">
                    <input
                      type="checkbox"
                      checked={products.length > 0 && selectedIds.length === products.length}
                      onChange={toggleSelectAll}
                      className="rounded border-white/10 bg-background text-tertiary focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                  </th>
                  <th className="py-3">{t('adminProducts.table.product')}</th>
                  <th className="py-3">{t('adminProducts.table.category')}</th>
                  <th className="py-3">{t('adminProducts.table.price')}</th>
                  <th className="py-3">{t('adminProducts.table.featured')}</th>
                  <th className="py-3">{t('adminProducts.table.availability')}</th>
                  <th className="py-3 text-right pr-3">{t('adminProducts.table.manage')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans normal-case text-on-surface-variant">
                {products.map((product) => {
                  const isSelected = selectedIds.includes(product.id);
                  const isArchived = !!product.deletedAt;
                  
                  return (
                    <tr key={product.id} className={`hover:bg-white/[0.01] transition-colors ${isSelected ? 'bg-white/[0.01]' : ''} ${isArchived ? 'opacity-50' : ''}`}>
                      <td className="py-4 pl-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(product.id)}
                          className="rounded border-white/10 bg-background text-tertiary focus:ring-0 focus:ring-offset-0 cursor-pointer"
                        />
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-sm">
                           <div className="w-10 h-12 rounded overflow-hidden bg-surface-low border border-white/5 shrink-0">
                            <SafeImage className="w-full h-full object-cover" src={product.images[0]} alt={product.name} />
                          </div>
                          <div>
                            <h4 className="font-bold text-white uppercase">{product.name}</h4>
                            <p className="text-[10px] text-on-surface-variant/60 font-mono mt-0.5">{product.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 font-label-caps text-[10px] text-white/80">{product.category}</td>
                      <td className="py-4 font-medium text-white">{formatPrice(product.price)}</td>
                      <td className="py-4">
                        <button
                          onClick={() => toggleFeaturedMutation.mutate(product.id)}
                          className="text-on-surface-variant hover:text-white"
                          title="Toggle Featured status"
                        >
                          {product.isFeatured ? (
                            <Star className="h-4.5 w-4.5 text-tertiary fill-tertiary" />
                          ) : (
                            <StarOff className="h-4.5 w-4.5 text-on-surface-variant/40" />
                          )}
                        </button>
                      </td>
                      <td className="py-4">
                        {isArchived ? (
                          <span className="text-[8px] font-label-caps px-2 py-0.5 rounded-full inline-block bg-red-500/10 border border-red-500/20 text-red-500">
                            {t('adminProducts.archived')}
                          </span>
                        ) : (
                          <span className="text-[8px] font-label-caps px-2 py-0.5 rounded-full inline-block bg-green-500/10 border border-green-500/20 text-green-500">
                            {t('adminProducts.active')}
                          </span>
                        )}
                      </td>
                      <td className="py-4 text-right pr-3 space-x-sm flex items-center justify-end gap-sm h-full pt-6">
                        <button
                          onClick={() => openEditModal(product)}
                          className="p-1.5 border border-white/10 hover:border-white/20 text-white rounded bg-white/[0.01] hover:bg-white/[0.02]"
                          title="Edit specs"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        
                        {isArchived ? (
                          <button
                            onClick={() => restoreProductMutation.mutate(product.id)}
                            className="px-2 py-1 text-[8px] font-label-caps bg-green-500/10 border border-green-500/20 text-green-500 rounded hover:bg-green-500 hover:text-white"
                          >
                            {t('adminProducts.restore')}
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              if (confirm(t('adminProducts.toast.confirmArchiveSingle', { name: product.name }))) {
                                deleteProductMutation.mutate(product.id);
                              }
                            }}
                            className="p-1.5 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white rounded"
                            title="Soft delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* CREATE & EDIT MODAL OVERLAY */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-6 overflow-y-auto pt-20 pb-12">
          
          <div className="w-full max-w-xl bg-surface border border-white/10 p-8 rounded-xl shadow-2xl space-y-lg my-auto">
            
            <div className="flex justify-between items-center border-b border-white/5 pb-sm">
              <h3 className="font-headline-lg text-lg text-white uppercase">
                {editingProduct ? t('adminProducts.editSpecsModal') : t('adminProducts.addSpecModal')}
              </h3>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="text-white hover:text-tertiary"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-md text-xs">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                <div className="space-y-xs">
                  <label className="font-label-caps text-[9px] text-on-surface-variant">{t('adminProducts.productName')}</label>
                  <input 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    required 
                    className="w-full bg-background border border-white/10 px-4 py-2.5 text-white rounded outline-none focus:border-tertiary uppercase"
                  />
                </div>
                <div className="space-y-xs">
                  <label className="font-label-caps text-[9px] text-on-surface-variant">{t('adminProducts.priceUsd')}</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={price} 
                    onChange={(e) => setPrice(e.target.value)} 
                    required 
                    className="w-full bg-background border border-white/10 px-4 py-2.5 text-white rounded outline-none focus:border-tertiary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                <div className="space-y-xs">
                  <label className="font-label-caps text-[9px] text-on-surface-variant">{t('adminProducts.table.category')}</label>
                  <select 
                    value={categoryId} 
                    onChange={(e) => setCategoryId(e.target.value)} 
                    className="w-full bg-background border border-white/10 px-4 py-2.5 text-white rounded outline-none focus:border-tertiary uppercase font-label-caps"
                    required
                  >
                    <option value="">{t('adminProducts.selectCategory', { defaultValue: 'Select Category' })}</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-xs">
                  <label className="font-label-caps text-[9px] text-on-surface-variant">{t('adminProducts.compareAtPrice')}</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={compareAtPrice} 
                    onChange={(e) => setCompareAtPrice(e.target.value)} 
                    className="w-full bg-background border border-white/10 px-4 py-2.5 text-white rounded outline-none focus:border-tertiary"
                  />
                </div>
              </div>

              {/* Cloudinary Drag & Drop Uploader */}
              <div className="space-y-xs">
                <label className="font-label-caps text-[9px] text-on-surface-variant">{t('adminProducts.dragDropUrl')}</label>
                <div 
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-dashed border-white/10 bg-background/50 hover:bg-background rounded-lg p-6 flex flex-col items-center justify-center gap-xs cursor-pointer transition-colors"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*"
                  />
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-xs">
                      <Loader2 className="w-6 h-6 text-tertiary animate-spin" />
                      <span className="text-[10px] text-on-surface-variant uppercase">{t('adminProducts.uploadingCloudinary')}</span>
                    </div>
                  ) : imagePreview ? (
                    <div className="flex flex-col items-center gap-sm">
                      <img src={imagePreview} className="h-16 w-14 object-cover rounded border border-white/5" alt="Preview" />
                      <span className="text-[9px] text-tertiary font-label-caps">{t('adminProducts.fileUploadComplete')}</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-6 w-6 text-on-surface-variant/40" />
                      <span className="text-[10px] text-on-surface-variant/70 uppercase">{t('adminProducts.dragBrowse')}</span>
                      <span className="text-[8px] text-on-surface-variant/40 font-mono">{t('adminProducts.formatsInfo')}</span>
                    </>
                  )}
                </div>
                {uploadError && (
                  <p className="text-[10px] text-red-500 font-mono uppercase mt-1">{uploadError}</p>
                )}
                <input 
                  type="text" 
                  value={imageUrl} 
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    setImagePreview(e.target.value);
                  }} 
                  className="w-full bg-background border border-white/10 px-4 py-2.5 text-white rounded outline-none focus:border-tertiary text-xs mt-1 text-left font-mono"
                  placeholder={t('adminProducts.imageUrlLink')}
                />
              </div>

              <div className="space-y-xs">
                <label className="font-label-caps text-[9px] text-on-surface-variant">{t('adminProducts.description')}</label>
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  required 
                  rows={3}
                  className="w-full bg-background border border-white/10 px-4 py-2.5 text-white rounded outline-none focus:border-tertiary font-sans text-sm text-left"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-md pt-xs text-left">
                {/* Sizes checkboxes */}
                <div className="space-y-sm">
                  <span className="font-label-caps text-[9px] text-on-surface-variant block mb-1">{t('adminProducts.availableSizes')}</span>
                  <div className="flex flex-wrap gap-xs">
                    {['S', 'M', 'L', 'XL', '28', '30', '32', '34', '36', '8', '9', '10', '11', '12', 'One Size'].map(sz => (
                      <button 
                        key={sz}
                        type="button"
                        onClick={() => toggleSize(sz)}
                        className={`px-3 py-1.5 border text-[10px] font-label-caps rounded ${
                          sizes.includes(sz) ? 'border-tertiary text-tertiary bg-tertiary/5' : 'border-white/10 text-on-surface-variant'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>

                {/* featured toggler */}
                <div className="space-y-sm">
                  <span className="font-label-caps text-[9px] text-on-surface-variant block mb-1">{t('adminProducts.promotionalMetadata')}</span>
                  <button
                    type="button"
                    onClick={() => setIsFeatured(!isFeatured)}
                    className={`w-full py-3.5 border font-button text-xs uppercase rounded flex items-center justify-center gap-xs ${
                      isFeatured ? 'border-tertiary text-tertiary bg-tertiary/5' : 'border-white/10 text-on-surface-variant'
                    }`}
                  >
                    <Star className="h-4 w-4" />
                    {isFeatured ? t('adminProducts.featuredActive') : t('adminProducts.promoteAsFeatured')}
                  </button>
                </div>
              </div>

              <div className="space-y-xs pt-xs text-left">
                <label className="font-label-caps text-[9px] text-on-surface-variant">{t('adminProducts.colorsComma')}</label>
                <input 
                  type="text" 
                  value={colors} 
                  onChange={(e) => setColors(e.target.value)} 
                  placeholder="e.g. Onyx Black, Phantom Grey, Vibrant Volt"
                  className="w-full bg-background border border-white/10 px-4 py-2.5 text-white rounded outline-none focus:border-tertiary font-sans text-left"
                />
              </div>

              <button 
                type="submit"
                disabled={isUploading}
                className="w-full py-4 bg-tertiary text-black font-button text-xs uppercase tracking-widest rounded hover:brightness-105 active:scale-[0.98] transition-all pt-md"
              >
                {editingProduct ? t('adminProducts.updateSpecs') : t('adminProducts.createEntry')}
              </button>

            </form>

          </div>

        </div>
      )}

    </div>
  );
}
