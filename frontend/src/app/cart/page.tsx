'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCartStore } from '../../store';
import { useCart } from '../../hooks/useCart';
import { useWishlistQuery, useToggleWishlistMutation } from '../../hooks/useWishlist';
import { Minus, Plus, Heart, Trash2, ShieldCheck, ShoppingBag, ShoppingCart } from 'lucide-react';
import { SafeImage } from '../../components/SafeImage';
import { CartCrossSells } from '../../components/recommendations';
import { useCurrency } from '../../providers/CurrencyProvider';
import { useTranslation } from '../../providers/I18nProvider';

export default function CartPage() {
  const router = useRouter();
  const { formatPrice, usdToActive } = useCurrency();
  const { locale, t } = useTranslation();
  
  // Zustand State (kept for promo code details)
  const { promoCode, discountPercentage, applyPromoCode } = useCartStore();
  
  // Unified dynamic cart & wishlist hooks
  const { items, updateQuantity, removeItem, getTotals, addToCart } = useCart();
  const { data: wishlistItems = [] } = useWishlistQuery();
  const toggleWishlistMutation = useToggleWishlistMutation();

  // Local State
  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState('');

  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const { subtotal, discount, tax, total } = getTotals();

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoInput.trim()) return;

    const success = applyPromoCode(promoInput);
    if (success) {
      setPromoError('');
    } else {
      setPromoError(t('cart.invalidPromo'));
    }
  };

  const handleMoveToWishlist = async (item: any) => {
    try {
      // Add to wishlist
      await toggleWishlistMutation.mutateAsync(item.product.id);
      // Remove from cart
      removeItem({ itemId: item.id, productId: item.product.id, size: item.size, color: item.color });
    } catch {
      // handled
    }
  };

  return (
    <div className="bg-background text-on-background min-h-screen pb-xxl">
      <main className="pt-8 px-4 md:px-margin-desktop max-w-container-max mx-auto space-y-xxl">
        
        <h1 className="font-headline-xl text-balance text-3xl md:text-5xl text-white uppercase tracking-tight">
          {t('cart.title')} ({cartCount})
        </h1>

        {items.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl items-start">
            
            {/* 1. Items List (Left: 8 cols) */}
            <div className="lg:col-span-8 space-y-lg">
              {items.map((item) => (
                <div 
                  key={`${item.product.id}-${item.size}-${item.color}`}
                  className="luxury-glass p-6 flex flex-col sm:flex-row gap-lg group rounded-xl"
                >
                  {/* Image */}
                  <div 
                    onClick={() => router.push(`/product/${item.product.id}`)}
                    className="w-full sm:w-40 aspect-[4/5] bg-surface-low overflow-hidden rounded-lg border border-white/5 cursor-pointer shrink-0"
                  >
                    <SafeImage 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      src={item.product.images[0]} 
                      alt={item.product.name} 
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div className="flex justify-between items-start gap-md">
                      <div>
                        <span className="font-label-caps text-[10px] text-tertiary">
                          {(item.product.category || '').toUpperCase()}
                        </span>
                        <h3 
                          onClick={() => router.push(`/product/${item.product.id}`)}
                          className="font-headline-lg text-lg text-white mt-xs uppercase cursor-pointer hover:text-tertiary transition-colors"
                        >
                          {item.product.name}
                        </h3>
                        <p className="text-xs text-on-surface-variant font-sans normal-case mt-1">
                          {t('cart.colorLabel')}: {item.color} / {t('cart.sizeLabel')}: {item.size}
                        </p>
                      </div>
                      <div className="font-headline-lg text-lg text-white">
                        {formatPrice(usdToActive(item.product.price * item.quantity))}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between mt-xl gap-md">
                      {/* Quantity Selector */}
                      <div className="flex items-center border border-white/10 rounded-lg overflow-hidden bg-[#111]">
                        <button 
                          onClick={() => updateQuantity({ itemId: item.id, productId: item.product.id, size: item.size, color: item.color, quantity: item.quantity - 1 })}
                          className="px-4 py-2 hover:bg-white/10 transition-colors text-white text-base"
                        >
                          <Minus className="text-white text-base" />
                        </button>
                        <span className="px-5 font-bold text-white text-sm">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity({ itemId: item.id, productId: item.product.id, size: item.size, color: item.color, quantity: item.quantity + 1 })}
                          className="px-4 py-2 hover:bg-white/10 transition-colors text-white text-base"
                        >
                          <Plus className="text-white text-base" />
                        </button>
                      </div>

                      {/* Item Actions */}
                      <div className="flex gap-lg">
                        <button 
                          onClick={() => handleMoveToWishlist(item)}
                          className="font-label-caps text-[10px] text-on-surface-variant hover:text-tertiary flex items-center gap-xs transition-colors"
                        >
                          <Heart className="h-[18px] w-[18px]" />
                          {t('cart.moveToWishlist')}
                        </button>
                        <button 
                          onClick={() => removeItem({ itemId: item.id, productId: item.product.id, size: item.size, color: item.color })}
                          className="font-label-caps text-[10px] text-red-500 hover:text-red-400 flex items-center gap-xs transition-colors"
                        >
                          <Trash2 className="h-[18px] w-[18px]" />
                          {t('cart.remove')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 2. Order Summary Panel (Right: 4 cols) */}
            <div className="lg:col-span-4 lg:sticky lg:top-24">
              <div className="luxury-glass p-8 rounded-xl space-y-lg">
                <h2 className="font-headline-lg text-xl text-white uppercase border-b border-white/5 pb-sm">
                  {t('cart.summary')}
                </h2>

                <div className="space-y-md border-b border-white/5 pb-md text-sm font-sans normal-case text-on-surface-variant">
                  <div className="flex justify-between">
                    <span>{t('cart.subtotal')}</span>
                    <span className="text-white">{formatPrice(usdToActive(subtotal))}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-tertiary">
                      <span>{t('cart.promoDiscount').replace('{percent}', discountPercentage.toString())}</span>
                      <span>-{formatPrice(usdToActive(discount))}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>{t('cart.shipping')}</span>
                    <span className="text-tertiary uppercase font-label-caps text-xs">{t('cart.free')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('cart.tax')} (8%)</span>
                    <span className="text-white">{formatPrice(usdToActive(tax))}</span>
                  </div>
                </div>

                {/* Promo Input */}
                <div>
                  <form onSubmit={handleApplyPromo} className="space-y-sm">
                    <label className="font-label-caps text-[10px] text-on-surface-variant block">
                      {t('cart.promoCode')}
                    </label>
                    <div className="flex gap-sm">
                      <input 
                        type="text"
                        value={promoInput}
                        onChange={(e) => setPromoInput(e.target.value)}
                        placeholder={t('cart.tryPromo')}
                        className="bg-surface border border-white/10 rounded px-4 py-2.5 flex-1 focus:ring-1 focus:ring-tertiary focus:border-tertiary outline-none text-white font-label-caps text-xs uppercase"
                      />
                      <button 
                        type="submit"
                        className="font-button text-xs px-6 border border-white/15 hover:bg-white/5 transition-colors rounded text-white"
                      >
                        {t('cart.apply')}
                      </button>
                    </div>
                  </form>
                  {promoError && (
                    <p className="text-red-500 font-label-caps text-[9px] mt-2">{promoError}</p>
                  )}
                  {promoCode && (
                    <p className="text-tertiary font-label-caps text-[9px] mt-2">
                      {t('cart.promoApplied').replace('{code}', promoCode)}
                    </p>
                  )}
                </div>

                {/* Totals */}
                <div className="flex justify-between items-end border-t border-white/5 pt-md">
                  <span className="font-headline-lg text-lg text-white uppercase">{t('cart.total')}</span>
                  <span className="font-headline-lg text-2xl text-tertiary">{formatPrice(usdToActive(total))}</span>
                </div>

                <button 
                  onClick={() => router.push('/checkout')}
                  className="w-full bg-tertiary text-on-tertiary font-button text-xs uppercase py-4 rounded hover:brightness-105 active:scale-[0.98] transition-all shadow-lg shadow-tertiary/10 tracking-widest"
                >
                  {t('cart.checkout')}
                </button>

                <div className="flex items-center justify-center gap-xs text-[11px] text-on-surface-variant/40 text-center font-sans normal-case pt-2">
                  <ShieldCheck className="h-4 w-4 text-tertiary" />
                  <span>{t('cart.secure')}</span>
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className="py-xxl text-center space-y-md border border-white/5 rounded-xl bg-surface-low">
            <ShoppingBag className="h-16 w-16" />
            <h3 className="font-headline-lg text-balance text-xl text-white">{t('cart.empty')}</h3>
            <p className="text-on-surface-variant text-sm text-pretty">
              {t('cart.emptyCartDesc')}
            </p>
            <Link 
              href="/shop"
              className="inline-block bg-white text-black hover:bg-tertiary transition-all px-8 py-4 font-button text-button uppercase rounded"
            >
              {t('cart.shopProducts')}
            </Link>
          </div>
        )}

        {/* AI Recommendations Cross-Sells */}
        {items.length > 0 && (
          <section className="border-t border-white/10 pt-xl">
            <CartCrossSells firstProductId={items[0]?.product?.id} />
          </section>
        )}

        {/* 3. Wishlist Upsell Section */}
        {wishlistItems.length > 0 && (
          <section className="border-t border-white/5 pt-xxl space-y-lg">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="font-headline-xl text-balance text-2xl text-white uppercase">{t('cart.upsellTitle')}</h2>
                <p className="text-on-surface-variant mt-xs text-sm font-sans normal-case text-pretty leading-relaxed">{t('cart.upsellDesc')}</p>
              </div>
              <Link href="/wishlist" className="font-label-caps text-xs text-tertiary underline hover:text-white transition-colors">
                {t('cart.upsellLink')}
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-lg">
              {wishlistItems.slice(0, 4).map((product) => (
                <div 
                  key={product.id}
                  className="group relative flex flex-col justify-between"
                >
                  <div className="aspect-[4/5] bg-surface-low relative overflow-hidden rounded-lg border border-white/5">
                    <SafeImage className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" src={product.images[0]} alt={product.name} />
                    <button 
                      onClick={() => toggleWishlistMutation.mutate(product.id)}
                      className="absolute top-4 right-4 bg-black/40 backdrop-blur-md p-2 rounded-full hover:text-red-500 transition-colors text-red-500"
                    >
                      <Heart className="h-[18px] w-[18px] fill-red-500 text-red-500" />
                    </button>
                    <div className="absolute bottom-0 left-0 w-full p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                      <button 
                        onClick={() => addToCart({ product, quantity: 1, size: product.sizes[0] || 'L', color: product.colors[0] || 'Onyx Black' })}
                        className="w-full bg-white text-black font-button text-xs py-3 rounded active:scale-95 transition-transform flex items-center justify-center gap-xs hover:bg-tertiary"
                      >
                        <ShoppingCart className="h-[18px] w-[18px]" />
                        {t('cart.moveBag')}
                      </button>
                    </div>
                  </div>
                  <div className="pt-sm space-y-xs">
                    <span className="font-label-caps text-[10px] text-on-surface-variant/40">{(product.category || '').toUpperCase()}</span>
                    <h4 className="font-button text-xs text-white uppercase group-hover:text-tertiary transition-colors break-normal text-pretty">{product.name}</h4>
                    <p className="font-body-md text-xs text-tertiary">{formatPrice(usdToActive(product.price))}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
