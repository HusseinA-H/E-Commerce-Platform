'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWishlistQuery, useToggleWishlistMutation } from '../../hooks/useWishlist';
import { useCart } from '../../hooks/useCart';
import { useHydrated } from '../../hooks/useHydrated';
import { ChevronRight, Heart, ShoppingCart } from 'lucide-react';
import { Product } from '../../types/index';
import { SafeImage } from '../../components/SafeImage';
import { useCurrency } from '../../providers/CurrencyProvider';
import { useTranslation } from '../../providers/I18nProvider';

export default function WishlistPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const { data: items = [] } = useWishlistQuery();
  const displayItems = hydrated ? items : [];
  const toggleWishlistMutation = useToggleWishlistMutation();
  const { addToCart } = useCart();
  const { formatPrice, usdToActive } = useCurrency();
  const { locale, t } = useTranslation();

  const handleMoveToCart = async (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    // Default to first size and color
    const size = product.sizes[0] || 'L';
    const color = product.colors[0] || 'Onyx Black';
    
    try {
      await addToCart({ product, quantity: 1, size, color });
      await toggleWishlistMutation.mutateAsync(product.id);
    } catch {
      // handled
    }
  };

  return (
    <div className="bg-background text-on-background min-h-screen pb-xxl">
      <main className="pt-8 px-6 md:px-margin-desktop max-w-container-max mx-auto space-y-xxl">
        
        {/* Header */}
        <div className="border-b border-white/5 pb-lg">
          <nav className="flex items-center gap-xs font-label-caps text-label-caps text-on-surface-variant/40 text-[10px] tracking-widest mb-md">
            <Link href="/" className="hover:text-on-surface transition-colors">{t('nav.home')}</Link>
            <ChevronRight className="h-3 w-3 rtl:rotate-180" />
            <span className="text-tertiary">{t('nav.wishlist')}</span>
          </nav>
          <h1 className="font-display-lg text-balance text-3xl md:text-5xl text-white uppercase tracking-tight">
            {t('cart.upsellTitle')}
          </h1>
          <p className="text-on-surface-variant text-sm leading-relaxed text-pretty mt-sm">
            {t('cart.upsellDesc')}
          </p>
        </div>

        {/* Content */}
        {displayItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-xl">
            {displayItems.map((product) => (
              <div 
                key={product.id}
                onClick={() => router.push(`/product/${product.slug || product.id}`)}
                className="group cursor-pointer flex flex-col justify-between"
              >
                <div className="relative aspect-[4/5] bg-surface-low overflow-hidden rounded-xl border border-white/5 shadow-2xl">
                  {/* Remove button */}
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleWishlistMutation.mutate(product.id); }}
                    className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/10 hover:text-red-500 transition-colors text-red-500"
                    title="Remove from wishlist"
                  >
                    <Heart className="h-[18px] w-[18px] fill-red-500 text-red-500" />
                  </button>
 
                  <SafeImage 
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105" 
                    src={product.images[0]} 
                    alt={product.name} 
                  />

                  {/* Add to Cart Overlay */}
                  <div className="absolute bottom-0 left-0 w-full p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 glass-card bg-black/40 border-t border-white/10">
                    <button 
                      onClick={(e) => handleMoveToCart(e, product)}
                      className="w-full py-3 bg-white hover:bg-tertiary hover:text-black text-black font-button text-xs uppercase transition-colors rounded flex items-center justify-center gap-xs"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      {t('cart.moveBag')}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-xs pt-md">
                  <span className="font-label-caps text-[10px] text-on-surface-variant/40 uppercase tracking-widest">{product.category}</span>
                  <h3 className="font-headline-lg text-sm text-white uppercase group-hover:text-tertiary transition-colors break-normal text-pretty">
                    {product.name}
                  </h3>
                  <span className="font-body-md text-sm text-tertiary">{formatPrice(usdToActive(product.price))}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-xxl text-center space-y-md border border-white/5 rounded-xl bg-surface-low">
            <Heart className="h-16 w-16 text-white/10" />
            <h3 className="font-headline-lg text-balance text-xl text-white">{t('cart.wishlistVacant')}</h3>
            <p className="text-on-surface-variant text-sm text-pretty">
              {t('cart.wishlistVacantDesc')}
            </p>
            <Link 
              href="/shop"
              className="inline-block bg-white text-black hover:bg-tertiary transition-all px-8 py-4 font-button text-button uppercase rounded"
            >
              {t('cart.exploreProducts')}
            </Link>
          </div>
        )}

      </main>
    </div>
  );
}
