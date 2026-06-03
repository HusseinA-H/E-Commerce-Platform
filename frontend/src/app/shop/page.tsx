'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { useProductsQuery } from '../../hooks/useProducts';
import { useCart } from '../../hooks/useCart';
import { useWishlistQuery, useToggleWishlistMutation } from '../../hooks/useWishlist';
import { Product } from '../../types/index';
import { ChevronLeft, ChevronRight, FilterX, Heart, Loader2, WifiOff, AlertTriangle } from 'lucide-react';
import { SafeImage } from '../../components/SafeImage';
import { getErrorMessage } from '../../lib/api-client';
import { useCurrency } from '../../providers/CurrencyProvider';
import { useTranslation } from '../../providers/I18nProvider';

export default function ShopPage() {
  const router = useRouter();
  const { formatPrice, usdToActive } = useCurrency();
  const { locale, t } = useTranslation();
  
  // --- Filtering & Sorting States ---
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedTechs, setSelectedTechs] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Build canonical filter key string — this is the single source of truth for filter identity
  const filterKey = useMemo(() => {
    const cat = selectedCategories[0] || '';
    const sizes = selectedSizes.length > 0 ? selectedSizes.join(',') : '';
    const colors = selectedColors.length > 0 ? selectedColors.join(',') : '';
    const tech = selectedTechs.length > 0 ? selectedTechs.join(',') : '';
    const sort = sortBy === 'price_low' ? 'price-asc' : sortBy === 'price_high' ? 'price-desc' : 'newest';
    return `${cat}|${sizes}|${colors}|${tech}|${sort}`;
  }, [selectedCategories, selectedSizes, selectedColors, selectedTechs, sortBy]);

  // Build the actual filter object from the key (deterministic reconstruction)
  const buildFiltersFromKey = useCallback((key: string) => {
    const [cat, sizes, colors, tech, sort] = key.split('|');
    return {
      categorySlug: cat || undefined,
      sizes: sizes ? sizes.split(',') : undefined,
      colors: colors ? colors.split(',') : undefined,
      tech: tech ? tech.split(',') : undefined,
      sort: sort || 'newest',
    };
  }, []);

  // Debounced filter key — string comparison eliminates all object reference issues
  const [debouncedFilterKey, setDebouncedFilterKey] = useState(filterKey);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear any pending debounce
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    debounceRef.current = setTimeout(() => {
      setDebouncedFilterKey(filterKey);
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [filterKey]); // String dependency — perfectly stable

  // Reconstruct filter object from debounced key
  const debouncedFilters = useMemo(
    () => buildFiltersFromKey(debouncedFilterKey),
    [debouncedFilterKey, buildFiltersFromKey]
  );

  // Check if active filters differ from debounced filters (transitioning state)
  const isDebouncing = filterKey !== debouncedFilterKey;

  const { data: products = [], isPending, isFetching, isError, error } = useProductsQuery(debouncedFilters);

  const isTransitioning = isFetching || isDebouncing;

  const isNetworkError = isError && (
    (error as any)?.code === 'ERR_NETWORK' || 
    !(error as any)?.response || 
    (error as any)?.message?.toLowerCase().includes('network')
  );

  const hasActiveFilters = selectedSizes.length > 0 || selectedColors.length > 0 || selectedTechs.length > 0;
  
  const activeCategoryLabel = selectedCategories[0]
    ? [
        { id: 'outerwear', label: t('shop.catOuterwear') },
        { id: 'tops', label: t('shop.catTops') },
        { id: 'bottoms', label: t('shop.catBottoms') },
        { id: 'footwear', label: t('shop.catFootwear') },
        { id: 'accessories', label: t('shop.catAccessories') }
      ].find(c => c.id === selectedCategories[0])?.label || selectedCategories[0]
    : '';

  // --- Cart and Wishlist hooks ---
  const { addToCart } = useCart();
  const toggleWishlistMutation = useToggleWishlistMutation();
  const { data: wishlistItems = [] } = useWishlistQuery();
  const hasItem = (productId: string) => wishlistItems.some((item) => item.id === productId);

  // --- Reset All Filters ---
  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedSizes([]);
    setSelectedColors([]);
    setSelectedTechs([]);
    setCurrentPage(1);
  };

  // --- Toggle Filter Handlers ---
  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [cat] // Single category filter for simpler backend mapping
    );
    setCurrentPage(1);
  };

  const toggleSize = (size: string) => {
    setSelectedSizes(prev =>
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    );
    setCurrentPage(1);
  };

  const toggleColor = (color: string) => {
    setSelectedColors(prev =>
      prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]
    );
    setCurrentPage(1);
  };

  const toggleTech = (tech: string) => {
    setSelectedTechs(prev =>
      prev.includes(tech) ? prev.filter(t => t !== tech) : [...prev, tech]
    );
    setCurrentPage(1);
  };

  // --- Pagination Slice ---
  const totalItems = products.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedProducts = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return products.slice(startIdx, startIdx + itemsPerPage);
  }, [products, currentPage]);

  const handleQuickAdd = async (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    const defaultSize = product.sizes[0] || 'L';
    const defaultColor = product.colors[0] || 'Onyx Black';
    
    const btn = e.currentTarget as HTMLButtonElement;
    const originalText = btn.innerText;
    btn.innerText = t('shop.adding');
    btn.disabled = true;

    try {
      await addToCart({ product, quantity: 1, size: defaultSize, color: defaultColor });
      
      btn.innerText = t('shop.addedToBag');
      btn.style.backgroundColor = '#d4ff3f';
      btn.style.color = '#000000';
    } catch {
      btn.innerText = t('shop.failed');
    } finally {
      btn.disabled = false;
      setTimeout(() => {
        btn.innerText = originalText;
        btn.style.backgroundColor = '#ffffff';
        btn.style.color = '#000000';
      }, 1500);
    }
  };

  const handleWishlistToggle = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    toggleWishlistMutation.mutate(product);
  };

  return (
    <div className="bg-background text-on-background min-h-screen">
      
      {/* 1. Header & Breadcrumbs */}
      <header className="px-4 md:px-margin-desktop py-xl max-w-container-max mx-auto">
        <nav className="flex items-center gap-xs font-label-caps text-label-caps text-on-surface-variant/40 mb-md text-[10px] tracking-widest">
          <Link href="/" className="hover:text-on-surface transition-colors">{t('nav.home')}</Link>
          <ChevronRight className="h-3 w-3 rtl:rotate-180" />
          <span className="text-tertiary">{t('shop.title')}</span>
        </nav>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-md border-b border-outline-variant pb-lg">
          <div>
            <h1 className="font-display-lg text-balance text-3xl md:text-5xl uppercase tracking-tight text-foreground">{t('shop.title')}</h1>
            <p className="text-on-surface-variant mt-sm max-w-lg text-sm leading-relaxed text-pretty">
              {t('shop.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-md border-b border-outline-variant pb-sm min-w-[220px]">
            <span className="font-label-caps text-label-caps text-outline text-[11px] uppercase tracking-wider text-on-surface-variant/60">{t('shop.sortBy')}</span>
            <select 
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
              className="bg-transparent text-foreground font-label-caps text-xs border-none focus:ring-0 cursor-pointer appearance-none outline-none uppercase"
            >
              <option value="newest" className="bg-surface text-foreground">{t('shop.newest')}</option>
              <option value="popular" className="bg-surface text-foreground">{t('shop.popular')}</option>
              <option value="price_low" className="bg-surface text-foreground">{t('shop.priceLow')}</option>
              <option value="price_high" className="bg-surface text-foreground">{t('shop.priceHigh')}</option>
            </select>
          </div>
        </div>
      </header>

      {/* 2. Main Content Grid */}
      <div className="max-w-container-max mx-auto px-4 md:px-margin-desktop flex flex-col lg:flex-row gap-xl pb-xxl">
        
        {/* Filter Sidebar */}
        <aside className="w-full lg:w-64 flex-shrink-0 lg:sticky lg:top-24 self-start max-h-[calc(100vh-120px)] lg:overflow-y-auto pr-md space-y-xl no-scrollbar border-b lg:border-b-0 border-outline-variant pb-lg lg:pb-0">
          <div className="flex justify-between items-center">
            <h2 className="font-label-caps text-xs text-foreground">{t('shop.filters')}</h2>
            {(selectedCategories.length > 0 || selectedSizes.length > 0 || selectedColors.length > 0 || selectedTechs.length > 0) && (
              <button 
                onClick={clearFilters}
                className="text-[10px] font-label-caps text-tertiary hover:underline"
              >
                {t('shop.clearAll')}
              </button>
            )}
          </div>

          <div className="space-y-lg divide-y divide-outline-variant">
            
            {/* Category Filter */}
            <div className="pt-0 space-y-md">
              <h3 className="font-label-caps text-label-caps text-xs text-foreground mb-2 pt-2">{t('shop.category')}</h3>
              <div className="space-y-sm">
                {[
                  { id: 'outerwear', label: t('shop.catOuterwear') },
                  { id: 'tops', label: t('shop.catTops') },
                  { id: 'bottoms', label: t('shop.catBottoms') },
                  { id: 'footwear', label: t('shop.catFootwear') },
                  { id: 'accessories', label: t('shop.catAccessories') }
                ].map((cat) => (
                  <label key={cat.id} className="flex items-center justify-between group cursor-pointer text-sm">
                    <span className={`transition-colors text-xs font-sans ${selectedCategories.includes(cat.id) ? 'text-tertiary' : 'text-on-surface-variant group-hover:text-tertiary'}`}>
                      {cat.label}
                    </span>
                    <input 
                      type="checkbox"
                      checked={selectedCategories.includes(cat.id)}
                      onChange={() => toggleCategory(cat.id)}
                      className="rounded-none bg-surface-high border-outline-variant text-tertiary focus:ring-tertiary focus:ring-0 w-4 h-4 cursor-pointer"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Size Filter */}
            <div className="pt-md space-y-md">
              <h3 className="font-label-caps text-label-caps text-xs text-foreground mb-2 pt-2">{t('shop.sizes')}</h3>
              <div className="grid grid-cols-4 gap-xs">
                {['XS', 'S', 'M', 'L', 'XL', '28', '30', '32', '34', '36', '8', '9', '10', '11', '12', 'One Size'].map((size) => (
                  <button 
                    key={size}
                    onClick={() => toggleSize(size)}
                    className={`py-2 border text-[10px] font-label-caps transition-all rounded ${
                      selectedSizes.includes(size)
                        ? 'border-tertiary text-tertiary bg-tertiary/5'
                        : 'border-outline-variant text-on-surface-variant hover:border-foreground hover:text-foreground'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Filter */}
            <div className="pt-md space-y-md">
              <h3 className="font-label-caps text-label-caps text-xs text-foreground mb-2 pt-2">{t('shop.colorPalette')}</h3>
              <div className="flex flex-wrap gap-sm">
                {[
                  { name: 'Black', hex: '#000000' },
                  { name: 'Grey', hex: '#444444' },
                  { name: 'White', hex: '#FFFFFF' },
                  { name: 'Volt', hex: '#d4ff3f' },
                  { name: 'Navy', hex: '#0a1d37' }
                ].map((color) => (
                  <button 
                    key={color.name}
                    onClick={() => toggleColor(color.name)}
                    className={`w-7 h-7 rounded-full border relative ${
                      selectedColors.includes(color.name)
                        ? 'ring-1 ring-offset-2 ring-tertiary ring-offset-background'
                        : 'border-outline'
                    }`}
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  >
                    {color.name === 'White' && (
                      <span className="absolute inset-0 rounded-full border border-black/10"></span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Tech Specs */}
            <div className="pt-md space-y-md">
              <h3 className="font-label-caps text-label-caps text-xs text-foreground mb-2 pt-2">{t('shop.technology')}</h3>
              <div className="space-y-sm">
                {['CARBON-CORE™', 'HYDROSHELL™', 'THERMO-GRID™', 'AERO-KNIT™', 'CARBON-PROPEL™'].map((tech) => (
                  <label key={tech} className="flex items-center gap-sm cursor-pointer group text-xs">
                    <input 
                      type="checkbox"
                      checked={selectedTechs.includes(tech)}
                      onChange={() => toggleTech(tech)}
                      className="rounded-none bg-surface-high border-outline-variant text-tertiary focus:ring-tertiary focus:ring-0 w-4 h-4"
                    />
                    <span className={`font-label-caps text-[10px] transition-colors ${selectedTechs.includes(tech) ? 'text-tertiary' : 'text-on-surface-variant group-hover:text-foreground'}`}>
                      {tech}
                    </span>
                  </label>
                ))}
              </div>
            </div>

          </div>
        </aside>

        {/* Product Grid Panel */}
        <section className="flex-grow">
          {isPending ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-y-xl gap-x-gutter">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex flex-col space-y-md animate-pulse">
                  <div className="aspect-[4/5] bg-surface-low rounded-xl border border-white/5" />
                  <div className="h-4 bg-surface-low rounded w-1/3" />
                  <div className="h-6 bg-surface-low rounded w-2/3" />
                  <div className="h-4 bg-surface-low rounded w-1/4" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="py-xxl text-center space-y-md">
              {isNetworkError ? (
                <>
                  <WifiOff className="h-12 w-12 text-red-500/80 mx-auto animate-pulse" />
                  <h3 className="font-headline-lg text-balance text-lg text-white">{t('errors.networkError')}</h3>
                  <p className="text-on-surface-variant text-sm text-pretty max-w-md mx-auto leading-relaxed">
                    {t('errors.networkErrorDesc')}
                  </p>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-12 w-12 text-yellow-500/80 mx-auto" />
                  <h3 className="font-headline-lg text-balance text-lg text-white">{t('errors.apiError')}</h3>
                  <p className="text-on-surface-variant text-sm text-pretty max-w-md mx-auto leading-relaxed">
                    {t('errors.apiErrorDesc').replace('{error}', getErrorMessage(error))}
                  </p>
                </>
              )}
              <button 
                onClick={() => window.location.reload()}
                className="px-6 py-2.5 border border-white hover:bg-white hover:text-black transition-all font-button text-xs uppercase rounded mt-md"
              >
                {t('shop.retryRequest')}
              </button>
            </div>
          ) : paginatedProducts.length > 0 ? (
            <>
              <div className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-y-xl gap-x-gutter transition-opacity duration-300 ${isTransitioning ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
                {paginatedProducts.map((product, idx) => (
                  <div 
                    key={product.id}
                    onClick={() => router.push(`/product/${product.slug || product.id}`)}
                    className="group cursor-pointer flex flex-col justify-between animate-fade-in"
                    style={{ animationDelay: `${idx * 80}ms` }}
                  >
                    <div className="relative aspect-[4/5] bg-surface-low overflow-hidden rounded-xl border border-white/5 shadow-2xl">
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 z-[1] transition-colors duration-500" />

                      {/* Badge labels */}
                      {product.stockQuantity === 0 ? (
                        <span className="absolute top-4 left-4 z-10 bg-red-500 text-white font-label-caps text-[9px] px-2.5 py-1 rounded-full">
                          {t('product.depleted')}
                        </span>
                      ) : product.stockQuantity! <= product.lowStockThreshold! ? (
                        <span className="absolute top-4 left-4 z-10 bg-yellow-500 text-black font-label-caps text-[9px] px-2.5 py-1 rounded-full">
                          {t('product.lowStock')}
                        </span>
                      ) : product.isNew ? (
                        <span className="absolute top-4 left-4 z-10 bg-tertiary text-on-tertiary font-label-caps text-[9px] px-2.5 py-1 rounded-full">
                          {t('shop.newArrivals')}
                        </span>
                      ) : product.isLimited ? (
                        <span className="absolute top-4 left-4 z-10 bg-white text-black font-label-caps text-[9px] px-2.5 py-1 rounded-full">
                          {t('product.limRelease')}
                        </span>
                      ) : null}

                      {/* Wishlist toggle button */}
                      <button 
                        onClick={(e) => handleWishlistToggle(e, product)}
                        className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/10 hover:text-red-500 transition-all duration-300 hover:scale-110 hover:bg-black/70 cursor-pointer"
                      >
                        <Heart className={`h-[18px] w-[18px] transition-transform duration-300 ${hasItem(product.id) ? 'fill-red-500 text-red-500 scale-110' : 'text-white'}`} />
                      </button>

                      {/* Image */}
                      <SafeImage 
                        className="w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-110" 
                        src={product.images[0]} 
                        alt={product.name}
                      />

                      {/* Quick Add overlay */}
                      {product.stockQuantity! > 0 && (
                        <div className="absolute bottom-0 left-0 w-full p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out glass-card bg-black/60 backdrop-blur-sm border-t border-white/10 z-[2]">
                          <button 
                            onClick={(e) => handleQuickAdd(e, product)}
                            className="w-full py-3 bg-white hover:bg-tertiary hover:text-black text-black font-button text-xs uppercase transition-all duration-300 rounded tracking-wider active:scale-[0.98]"
                          >
                            {t('shop.quickAdd')}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-xs pt-md transition-all duration-300 group-hover:translate-x-1">
                      <div className="flex justify-between items-center w-full">
                        <span className="font-label-caps text-[10px] text-on-surface-variant/40 uppercase tracking-widest">{product.category}</span>
                        {product.stockQuantity === 0 ? (
                          <span className="text-[8px] font-label-caps text-red-500 uppercase font-bold">{t('product.depleted')}</span>
                        ) : product.stockQuantity! <= product.lowStockThreshold! ? (
                          <span className="text-[8px] font-label-caps text-yellow-400 uppercase font-bold">{t('product.lowStock')}</span>
                        ) : null}
                      </div>
                      <h3 className="font-headline-lg text-sm text-foreground uppercase group-hover:text-tertiary transition-colors duration-300 break-normal text-pretty">
                        {product.name}
                      </h3>
                      <span className="font-body-md text-sm text-on-surface-variant">{formatPrice(usdToActive(product.price))}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="mt-xxl flex justify-center items-center gap-md">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="w-10 h-10 flex items-center justify-center border border-outline-variant hover:border-tertiary transition-colors disabled:opacity-40 disabled:hover:border-outline-variant rounded"
                  >
                    <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button 
                       key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-10 h-10 flex items-center justify-center border rounded font-button text-xs ${
                        currentPage === page
                          ? 'border-tertiary text-tertiary bg-tertiary/5'
                          : 'border-outline-variant hover:border-foreground text-foreground'
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  <button 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="w-10 h-10 flex items-center justify-center border border-outline-variant hover:border-tertiary transition-colors disabled:opacity-40 disabled:hover:border-outline-variant rounded"
                  >
                    <ChevronRight className="h-5 w-5 rtl:rotate-180" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="py-xxl text-center space-y-md">
              <FilterX className="h-12 w-12 text-white/20 mx-auto" />
              {hasActiveFilters ? (
                <>
                  <h3 className="font-headline-lg text-balance text-lg text-white">{t('shop.noProductsMatch')}</h3>
                  <p className="text-on-surface-variant text-sm text-pretty leading-relaxed max-w-md mx-auto">
                    {t('shop.adjustFiltersDesc')}
                  </p>
                  <button 
                    onClick={clearFilters}
                    className="px-6 py-2.5 border border-white hover:bg-white hover:text-black transition-all font-button text-xs uppercase rounded mt-md"
                  >
                    {t('shop.resetFilters')}
                  </button>
                </>
              ) : (
                <>
                  <h3 className="font-headline-lg text-balance text-lg text-white">{t('shop.noItemsCategory')}</h3>
                  <p className="text-on-surface-variant text-sm text-pretty leading-relaxed max-w-md mx-auto">
                    {t('shop.noItemsCategoryDesc')}
                  </p>
                  {selectedCategories.length > 0 && (
                    <button 
                      onClick={clearFilters}
                      className="px-6 py-2.5 border border-white hover:bg-white hover:text-black transition-all font-button text-xs uppercase rounded mt-md"
                    >
                      {t('shop.viewAllProducts')}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
