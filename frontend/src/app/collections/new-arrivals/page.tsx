'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useProductsQuery } from '../../../hooks/useProducts';
import { useCart } from '../../../hooks/useCart';
import { useWishlistQuery, useToggleWishlistMutation } from '../../../hooks/useWishlist';
import { Product } from '../../../types/index';
import { ChevronLeft, ChevronRight, Heart, FilterX, WifiOff, AlertTriangle } from 'lucide-react';
import { SafeImage } from '../../../components/SafeImage';
import { getErrorMessage } from '../../../lib/api-client';
import { useCurrency } from '../../../providers/CurrencyProvider';
import { useTranslation } from '../../../providers/I18nProvider';

export default function NewArrivalsPage() {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('newest');
  const itemsPerPage = 6;
  const { formatPrice, usdToActive } = useCurrency();
  const { locale, t } = useTranslation();

  const { data: allProducts = [], isPending, isFetching, isError, error } = useProductsQuery({ sort: sortBy });

  const isNetworkError = isError && (
    (error as any)?.code === 'ERR_NETWORK' || 
    !(error as any)?.response || 
    (error as any)?.message?.toLowerCase().includes('network')
  );

  const products = useMemo(() => {
    return allProducts.filter((p) => p.isNew);
  }, [allProducts]);

  const { addToCart } = useCart();
  const toggleWishlistMutation = useToggleWishlistMutation();
  const { data: wishlistItems = [] } = useWishlistQuery();
  const hasItem = (productId: string) => wishlistItems.some((item) => item.id === productId);

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
      <header className="px-4 md:px-margin-desktop py-xl max-w-container-max mx-auto">
        <nav className="flex items-center gap-xs font-label-caps text-label-caps text-on-surface-variant/40 mb-md text-[10px] tracking-widest">
          <Link href="/" className="hover:text-on-surface transition-colors">{t('nav.home')}</Link>
          <ChevronRight className="h-3 w-3 rtl:rotate-180" />
          <span className="text-tertiary">{t('nav.newArrivals')}</span>
        </nav>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-md border-b border-white/5 pb-lg">
          <div>
            <h1 className="font-display-lg text-balance text-3xl md:text-5xl uppercase tracking-tight text-white">{t('nav.newArrivals')}</h1>
            <p className="text-on-surface-variant mt-sm max-w-lg text-sm leading-relaxed text-pretty">
              {t('shop.newArrivalsDesc')}
            </p>
          </div>
          <div className="flex items-center gap-md border-b border-white/10 pb-sm min-w-[220px]">
            <span className="font-label-caps text-label-caps text-outline text-[11px] uppercase tracking-wider text-on-surface-variant/60">{t('shop.sortBy')}</span>
            <select
              value={sortBy === 'newest' ? 'newest' : sortBy}
              onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
              className="bg-transparent text-white font-label-caps text-xs border-none focus:ring-0 cursor-pointer appearance-none outline-none uppercase"
            >
              <option value="newest" className="bg-[#111] text-white">{t('shop.newest')}</option>
              <option value="price-asc" className="bg-[#111] text-white">{t('shop.priceLow')}</option>
              <option value="price-desc" className="bg-[#111] text-white">{t('shop.priceHigh')}</option>
            </select>
          </div>
        </div>
      </header>

      <div className="max-w-container-max mx-auto px-4 md:px-margin-desktop pb-xxl">
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
              <div className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-y-xl gap-x-gutter transition-opacity duration-300 ${isFetching ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
                {paginatedProducts.map((product, idx) => (
                  <div
                    key={product.id}
                    onClick={() => router.push(`/product/${product.slug || product.id}`)}
                    className="group cursor-pointer flex flex-col justify-between animate-fade-in"
                    style={{ animationDelay: `${idx * 80}ms` }}
                  >
                    <div className="relative aspect-[4/5] bg-surface-low overflow-hidden rounded-xl border border-white/5 shadow-2xl">
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 z-[1] transition-colors duration-500" />
                      {product.isNew && (
                        <span className="absolute top-4 left-4 z-10 bg-tertiary text-on-tertiary font-label-caps text-[9px] px-2.5 py-1 rounded-full">
                          {t('shop.newArrivals')}
                        </span>
                      )}
                      {product.isLimited && (
                        <span className="absolute top-4 left-4 z-10 bg-white text-black font-label-caps text-[9px] px-2.5 py-1 rounded-full">
                          {t('product.limRelease')}
                        </span>
                      )}
                      <button
                        onClick={(e) => handleWishlistToggle(e, product)}
                        className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/10 hover:text-red-500 transition-all duration-300 hover:scale-110 hover:bg-black/70 cursor-pointer"
                      >
                        <Heart className={`h-[18px] w-[18px] transition-transform duration-300 ${hasItem(product.id) ? 'fill-red-500 text-red-500 scale-110' : 'text-white'}`} />
                      </button>
                      <SafeImage
                        className="w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-110"
                        src={product.images[0]}
                        alt={product.name}
                      />
                      <div className="absolute bottom-0 left-0 w-full p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out glass-card bg-black/60 backdrop-blur-sm border-t border-white/10 z-[2]">
                        <button
                          onClick={(e) => handleQuickAdd(e, product)}
                          className="w-full py-3 bg-white hover:bg-tertiary hover:text-black text-black font-button text-xs uppercase transition-all duration-300 rounded tracking-wider active:scale-[0.98]"
                        >
                          {t('shop.quickAdd')}
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-xs pt-md transition-all duration-300 group-hover:translate-x-1">
                      <span className="font-label-caps text-[10px] text-on-surface-variant/40 uppercase tracking-widest">{product.category}</span>
                      <h3 className="font-headline-lg text-sm text-white uppercase group-hover:text-tertiary transition-colors duration-300 break-normal text-pretty">
                        {product.name}
                      </h3>
                      <span className="font-body-md text-sm text-on-surface-variant">{formatPrice(usdToActive(product.price))}</span>
                    </div>
                  </div>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="mt-xxl flex justify-center items-center gap-md">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="w-10 h-10 flex items-center justify-center border border-white/10 hover:border-tertiary transition-colors disabled:opacity-40 disabled:hover:border-white/10 rounded"
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
                          : 'border-white/10 hover:border-white text-white'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="w-10 h-10 flex items-center justify-center border border-white/10 hover:border-tertiary transition-colors disabled:opacity-40 disabled:hover:border-white/10 rounded"
                  >
                    <ChevronRight className="h-5 w-5 rtl:rotate-180" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="py-xxl text-center space-y-md">
              <FilterX className="h-12 w-12 text-white/20" />
              <h3 className="font-headline-lg text-balance text-lg text-white">{t('shop.noNewArrivals')}</h3>
              <p className="text-on-surface-variant text-sm text-pretty leading-relaxed">{t('shop.noNewArrivalsDesc')}</p>
              <Link
                href="/shop"
                className="inline-block px-6 py-2.5 border border-white hover:bg-white hover:text-black transition-all font-button text-xs uppercase rounded"
              >
                {t('shop.viewAllProducts')}
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
