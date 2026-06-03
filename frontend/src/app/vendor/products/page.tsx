'use client';

import React, { useState, useEffect } from 'react';
import { 
  Loader2, 
  Plus, 
  Edit, 
  Trash2, 
  AlertTriangle,
  ArrowLeft,
  X
} from 'lucide-react';
import { apiClient, getErrorMessage } from '../../../lib/api-client';
import { useTranslation } from '../../../providers/I18nProvider';
import { useCurrency } from '../../../providers/CurrencyProvider';

interface Product {
  id: string;
  name: string;
  price: number;
  compareAtPrice: number | null;
  stockQuantity: number;
  inventoryStatus: string;
  category: { name: string; id: string };
  images: Array<{ url: string }>;
}

export default function VendorProducts() {
  const { locale, t } = useTranslation();
  const { formatPrice } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Form modal states
  const [isModalOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [compareAtPrice, setCompareAtPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('10');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [imagesInput, setImagesInput] = useState('');
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);

  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size'];
  const colors = ['Onyx Black', 'Volt', 'Slate Gray', 'Concrete', 'White', 'Neon Red', 'Electric Blue'];

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [prodRes, catRes] = await Promise.all([
        apiClient.get('/vendor/products'),
        apiClient.get('/categories'),
      ]);
      setProducts(prodRes.data);
      setCategories(catRes.data);
      if (catRes.data.length > 0) {
        setCategoryId(catRes.data[0].id);
      }
    } catch (e: any) {
      setErrorMsg(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setName('');
    setPrice('');
    setCompareAtPrice('');
    setStockQuantity('10');
    setLowStockThreshold('5');
    setDescription('');
    setImagesInput('');
    setSelectedSizes(['M', 'L']);
    setSelectedColors(['Onyx Black']);
    if (categories.length > 0) {
      setCategoryId(categories[0].id);
    }
    setIsOpen(true);
  };

  const openEditModal = (p: any) => {
    setEditingId(p.id);
    setName(p.name);
    setPrice(p.price.toString());
    setCompareAtPrice(p.compareAtPrice ? p.compareAtPrice.toString() : '');
    setStockQuantity(p.stockQuantity.toString());
    setLowStockThreshold(p.lowStockThreshold?.toString() || '5');
    setCategoryId(p.categoryId || p.category?.id || '');
    setDescription(p.description || '');
    setImagesInput(p.images?.map((img: any) => img.url).join(', ') || '');
    setSelectedSizes(p.sizes || []);
    setSelectedColors(p.colors || []);
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('vendor.deleteProductConfirm'))) return;
    try {
      await apiClient.delete(`/vendor/products/${id}`);
      fetchData();
    } catch (e: any) {
      alert(getErrorMessage(e));
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');

    const urls = imagesInput
      .split(',')
      .map((url) => url.trim())
      .filter((url) => url.length > 0);

    const payload = {
      name,
      price,
      compareAtPrice: compareAtPrice || null,
      stockQuantity,
      lowStockThreshold,
      categoryId,
      description,
      images: urls.length > 0 ? urls : ['https://images.unsplash.com/photo-1542291026-7eec264c27ff'],
      sizes: selectedSizes,
      colors: selectedColors,
    };

    try {
      if (editingId) {
        await apiClient.patch(`/vendor/products/${editingId}`, payload);
      } else {
        await apiClient.post('/vendor/products', payload);
      }
      setIsOpen(false);
      fetchData();
    } catch (err: any) {
      setErrorMsg(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSize = (size: string) => {
    if (selectedSizes.includes(size)) {
      setSelectedSizes(selectedSizes.filter((s) => s !== size));
    } else {
      setSelectedSizes([...selectedSizes, size]);
    }
  };

  const toggleColor = (color: string) => {
    if (selectedColors.includes(color)) {
      setSelectedColors(selectedColors.filter((c) => c !== color));
    } else {
      setSelectedColors([...selectedColors, color]);
    }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-md">
        <Loader2 className="h-8 w-8 text-tertiary animate-spin" />
        <span className="text-sm text-on-surface-variant font-semibold">{t('vendor.loadingCatalog')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-xl text-start">
      <div className="flex justify-between items-center border-b border-outline-variant pb-md">
        <div>
          <h1 className="font-display-lg text-2xl text-white uppercase font-black">
            {t('vendor.products')}
          </h1>
          <p className="text-on-surface-variant text-xs mt-xs">
            {t('vendor.listProductsDesc')}
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-white text-black hover:bg-tertiary px-5 py-2.5 font-button text-xs rounded uppercase font-bold transition-all flex items-center gap-xs"
        >
          <Plus className="h-4 w-4" />
          {t('vendor.addProduct')}
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded">
          {errorMsg}
        </div>
      )}

      {products.length === 0 ? (
        <div className="luxury-glass p-12 rounded-xl text-center border border-outline-variant space-y-sm text-on-surface-variant">
          <AlertTriangle className="h-10 w-10 text-white/20 mx-auto" />
          <p className="text-sm font-semibold">{t('vendor.noProducts')}</p>
          <button onClick={openAddModal} className="text-xs text-tertiary underline uppercase tracking-wider font-bold">
            {t('vendor.createFirstProduct')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
          {products.map((p) => (
            <div key={p.id} className="luxury-glass rounded-xl border border-outline-variant overflow-hidden flex flex-col justify-between group">
              <div className="aspect-[4/3] bg-neutral-900 overflow-hidden relative border-b border-outline-variant">
                <img 
                  src={p.images?.[0]?.url || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff'} 
                  alt={p.name}
                  className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                />
                <span className="absolute top-3 start-3 bg-black/60 backdrop-blur border border-white/10 text-[9px] font-bold text-white px-2 py-0.5 rounded">
                  {p.category?.name?.toUpperCase()}
                </span>
                <span className={`absolute top-3 end-3 text-[9px] font-bold px-2 py-0.5 rounded ${
                  p.stockQuantity === 0 
                    ? 'bg-red-500/20 border border-red-500/10 text-red-400' 
                    : p.stockQuantity <= 5 
                    ? 'bg-yellow-500/20 border border-yellow-500/10 text-yellow-500' 
                    : 'bg-green-500/20 border border-green-500/10 text-green-400'
                }`}>
                  {p.inventoryStatus.replace('_', ' ')}: {p.stockQuantity}
                </span>
              </div>
              <div className="p-5 space-y-md">
                <div className="space-y-xs">
                  <h4 className="font-bold text-sm text-white line-clamp-1">{p.name}</h4>
                  <div className="flex items-center gap-sm">
                    <span className="text-sm font-black text-tertiary">{formatPrice(p.price)}</span>
                    {p.compareAtPrice && (
                      <span className="text-xs text-on-surface-variant line-through">{formatPrice(p.compareAtPrice)}</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-sm pt-xs border-t border-white/5">
                  <button
                    onClick={() => openEditModal(p)}
                    className="flex-1 py-2 border border-outline-variant hover:bg-white/5 text-white text-[11px] font-bold rounded uppercase transition-colors flex items-center justify-center gap-1"
                  >
                    <Edit className="h-3 w-3" /> {t('vendor.edit')}
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="py-2 px-3 border border-red-500/20 hover:bg-red-500 hover:text-white text-red-500 text-[11px] font-bold rounded transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )/* end products.length check */}

      {/* Product Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface border border-outline-variant w-full max-w-2xl rounded-2xl p-6 md:p-8 space-y-lg relative max-h-[90vh] overflow-y-auto text-start">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="font-display-lg text-xl text-white uppercase font-black">
              {editingId ? t('vendor.editProductTitle') : t('vendor.addProductTitle')}
            </h3>

            <form onSubmit={handleFormSubmit} className="space-y-md font-sans">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                <div className="space-y-xs">
                  <label className="text-[10px] font-label-caps text-on-surface-variant">{t('vendor.productName')}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full bg-background border border-outline-variant px-4 py-2.5 rounded text-sm text-white focus:border-tertiary outline-none"
                    placeholder="e.g. APEX COMPRESSION SHIRT"
                  />
                </div>
                <div className="space-y-xs">
                  <label className="text-[10px] font-label-caps text-on-surface-variant">{t('vendor.category')}</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    required
                    className="w-full bg-background border border-outline-variant px-4 py-2.5 rounded text-sm text-white focus:border-tertiary outline-none cursor-pointer"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-md">
                <div className="space-y-xs">
                  <label className="text-[10px] font-label-caps text-on-surface-variant">{t('vendor.price')}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                    className="w-full bg-background border border-outline-variant px-4 py-2.5 rounded text-sm text-white focus:border-tertiary outline-none"
                  />
                </div>
                <div className="space-y-xs">
                  <label className="text-[10px] font-label-caps text-on-surface-variant">{t('vendor.compareAt')}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={compareAtPrice}
                    onChange={(e) => setCompareAtPrice(e.target.value)}
                    className="w-full bg-background border border-outline-variant px-4 py-2.5 rounded text-sm text-white focus:border-tertiary outline-none"
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-xs">
                  <label className="text-[10px] font-label-caps text-on-surface-variant">{t('vendor.stockQty')}</label>
                  <input
                    type="number"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    required
                    className="w-full bg-background border border-outline-variant px-4 py-2.5 rounded text-sm text-white focus:border-tertiary outline-none"
                  />
                </div>
                <div className="space-y-xs">
                  <label className="text-[10px] font-label-caps text-on-surface-variant">{t('vendor.lowStockCap')}</label>
                  <input
                    type="number"
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(e.target.value)}
                    required
                    className="w-full bg-background border border-outline-variant px-4 py-2.5 rounded text-sm text-white focus:border-tertiary outline-none"
                  />
                </div>
              </div>

              <div className="space-y-xs">
                <label className="text-[10px] font-label-caps text-on-surface-variant">{t('vendor.description')}</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full h-24 bg-background border border-outline-variant px-4 py-2.5 rounded text-sm text-white focus:border-tertiary outline-none resize-none"
                  placeholder="Provide technical garment details..."
                />
              </div>

              <div className="space-y-xs">
                <label className="text-[10px] font-label-caps text-on-surface-variant">{t('vendor.imagesLabel')}</label>
                <input
                  type="text"
                  value={imagesInput}
                  onChange={(e) => setImagesInput(e.target.value)}
                  className="w-full bg-background border border-outline-variant px-4 py-2.5 rounded text-sm text-white focus:border-tertiary outline-none"
                  placeholder="e.g. https://image1.jpg, https://image2.jpg"
                />
              </div>

              {/* Sizes checklist */}
              <div className="space-y-xs">
                <label className="text-[10px] font-label-caps text-on-surface-variant block">{t('vendor.availableSizes')}</label>
                <div className="flex flex-wrap gap-sm">
                  {sizes.map((s) => {
                    const isSelected = selectedSizes.includes(s);
                    return (
                      <button
                        type="button"
                        key={s}
                        onClick={() => toggleSize(s)}
                        className={`px-3 py-1.5 border text-xs font-semibold rounded transition-all ${
                          isSelected ? 'bg-white text-black border-white' : 'bg-transparent text-white border-outline-variant hover:border-white/30'
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Colors checklist */}
              <div className="space-y-xs">
                <label className="text-[10px] font-label-caps text-on-surface-variant block">{t('vendor.availableColors')}</label>
                <div className="flex flex-wrap gap-sm">
                  {colors.map((c) => {
                    const isSelected = selectedColors.includes(c);
                    return (
                      <button
                        type="button"
                        key={c}
                        onClick={() => toggleColor(c)}
                        className={`px-3 py-1.5 border text-xs font-semibold rounded transition-all ${
                          isSelected ? 'bg-white text-black border-white' : 'bg-transparent text-white border-outline-variant hover:border-white/30'
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-md pt-lg border-t border-white/5">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-tertiary text-on-tertiary hover:opacity-90 py-3.5 rounded font-button text-xs uppercase font-bold transition-all flex items-center justify-center gap-xs"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('vendor.saveProduct')}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-6 py-3.5 border border-outline-variant hover:bg-white/5 text-white rounded font-button text-xs uppercase font-bold transition-all"
                >
                  {t('profile.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
