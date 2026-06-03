'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, ChevronDown, Heart, CheckCircle, Star, Plus, Sparkles, Loader2 } from 'lucide-react';
import { useProductQuery } from '../../../hooks/useProducts';
import { useCompatibleOutfitsQuery } from '../../../hooks/useAdmin';
import { useCart } from '../../../hooks/useCart';
import { useWishlistQuery, useToggleWishlistMutation } from '../../../hooks/useWishlist';
import { useUIStore } from '../../../store';
import { SafeImage, getSafeUrl } from '../../../components/SafeImage';
import ProductDetailSkeleton from '../../../components/ProductDetailSkeleton';
import { FrequentlyBoughtTogether, CompleteTheLookCarousel, RelatedProductsCarousel } from '../../../components/recommendations';
import { useCurrency } from '../../../providers/CurrencyProvider';
import { useTranslation } from '../../../providers/I18nProvider';
import { useHydrated } from '../../../hooks/useHydrated';

export default function ProductDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const hydrated = useHydrated();
  const { formatPrice, usdToActive } = useCurrency();
  const { locale, t } = useTranslation();
  
  // --- React Query ---
  const { data: product, isLoading } = useProductQuery(id);
  // Complementary products: fetched dynamically via AI styling compatibility mappings
  const { data: rawComplementary = [] } = useCompatibleOutfitsQuery(id);

  const { addToCart } = useCart();
  const toggleWishlistMutation = useToggleWishlistMutation();
  const { data: wishlistItems = [] } = useWishlistQuery();
  const hasItem = (productId: string) => wishlistItems.some((item) => item.id === productId);
  const openAIStylist = useUIStore((state) => state.openAIStylist);

  const [prevId, setPrevId] = useState(id);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [addedNotification, setAddedNotification] = useState(false);

  const getColorDefaultImage = (color: string, images: string[]) => {
    if (!images.length) return null;
    const colorLower = color.toLowerCase();
    if (colorLower === 'black') {
      const blackImage = images.find((img) => img.toLowerCase().includes('-black-'));
      return blackImage || images[0] || null;
    }
    const colorImage = images.find((img) => img.toLowerCase().includes(`-${colorLower}-`));
    return colorImage || images[0] || null;
  };

  // Set initial states once product is loaded
  React.useEffect(() => {
    if (product) {
      const initialColor = product.colors[0] || '';
      setSelectedColor(initialColor);
      setSelectedImage(getColorDefaultImage(initialColor, product.images));
      setSelectedSize(product.sizes[0] || '');
    }
  }, [product]);

  // Sync state if navigation target ID changes
  if (id !== prevId) {
    setPrevId(id);
    if (product) {
      const initialColor = product.colors[0] || '';
      setSelectedColor(initialColor);
      setSelectedImage(getColorDefaultImage(initialColor, product.images));
      setSelectedSize(product.sizes[0] || '');
    }
  }

  if (isLoading || !product) {
    return <ProductDetailSkeleton />;
  }

  // Get AI recommended complementary products (curated by catalog intelligence)
  const complementaryProducts = rawComplementary.slice(0, 4);

  const handleAddToCart = async () => {
    if (!selectedSize) return;
    try {
      await addToCart({ product, quantity: 1, size: selectedSize, color: selectedColor || 'Onyx Black' });
      
      // Show visual confirmation toast
      setAddedNotification(true);
      setTimeout(() => setAddedNotification(false), 3000);
    } catch {
      // handled by useCart
    }
  };

  const handleWishlistToggle = () => {
    toggleWishlistMutation.mutate(product);
  };

  return (
    <div className="bg-background text-on-background min-h-screen pb-xxl">
      
      {/* Dynamic Toast Notification for Add to Cart */}
      {addedNotification && (
        <div className="fixed top-24 right-6 z-50 p-4 bg-tertiary text-black font-button text-xs rounded-lg shadow-2xl flex items-center gap-sm animate-slide-in">
          <CheckCircle className="h-5 w-5 font-bold" />
          <span>{t('product.addedNotification').replace('{name}', product.name.toUpperCase()).replace('{size}', selectedSize)}</span>
        </div>
      )}

      {/* Main product detail block */}
      <main className="pt-8 pb-xxl px-4 md:px-margin-desktop max-w-container-max mx-auto space-y-xxl">
        
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-xs font-label-caps text-label-caps text-on-surface-variant/40 text-[10px] tracking-widest">
          <Link href="/" className="hover:text-on-surface transition-colors">{t('nav.home')}</Link>
          <ChevronRight className="h-3 w-3 rtl:rotate-180" />
           <Link href="/shop" className="hover:text-on-surface transition-colors">{t('nav.shop')}</Link>
           <ChevronRight className="h-3 w-3 rtl:rotate-180" />
          <span className="text-tertiary">{product.name}</span>
        </nav>

        {/* Gallery and Details layout */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
          
          {/* Gallery (Left: 7 cols) */}
          <div className="lg:col-span-7 space-y-md">
            <div className="aspect-[4/5] bg-surface-low overflow-hidden rounded-xl border border-white/5 relative group">
              <SafeImage 
                className="w-full h-full object-cover transition-opacity duration-300" 
                src={selectedImage} 
                alt={product.name} 
              />
              
              {product.isLimited && (
                <span className="absolute top-4 left-4 bg-white text-black font-label-caps text-[9px] px-3 py-1 rounded">
                  {t('product.limRelease')}
                </span>
              )}
            </div>

            {/* Thumbnails grid */}
            {product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-sm">
                {product.images.map((img, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setSelectedImage(img)}
                    className={`aspect-[4/5] bg-surface-low overflow-hidden rounded-lg border transition-all ${
                      selectedImage === img 
                        ? 'border-2 border-tertiary' 
                        : 'border-white/5 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <SafeImage className="w-full h-full object-cover" src={img} alt={`${product.name} detail ${idx + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details & Selectors (Right: 5 cols) */}
          <div className="lg:col-span-5 space-y-lg lg:sticky lg:top-24 h-fit">
            
            {/* Title & Price */}
            <div className="space-y-sm">
              <div className="flex flex-wrap items-center gap-xs">
                <p className="font-label-caps text-label-caps text-tertiary text-xs">
                  {(product.category || '').toUpperCase()} {t('product.series')}
                </p>
                {product.stockQuantity === 0 ? (
                  <span className="bg-red-500/10 border border-red-500/20 text-red-500 text-[8px] font-label-caps px-2 py-0.5 rounded-full">{t('product.outOfStock')}</span>
                ) : product.stockQuantity! <= product.lowStockThreshold! ? (
                  <span className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[8px] font-label-caps px-2 py-0.5 rounded-full">{t('product.onlyUnitsLeft').replace('{count}', (product.stockQuantity ?? 0).toString())}</span>
                ) : (
                  <span className="bg-green-500/10 border border-green-500/20 text-green-500 text-[8px] font-label-caps px-2 py-0.5 rounded-full">{t('product.inStock')}</span>
                )}
              </div>
              <h1 className="font-headline-xl text-balance text-3xl md:text-4xl text-foreground uppercase tracking-tight leading-none">
                {product.name}
              </h1>
              <p className="font-headline-lg text-2xl text-foreground pt-2">
                {formatPrice(usdToActive(product.price))}
              </p>
            </div>

            {/* Description */}
            <p className="font-body-md text-on-surface-variant text-sm leading-relaxed text-pretty">
                {product.description}
              </p>

            {/* Color Selector */}
            {product.colors.length > 0 && (
              <div className="space-y-md">
                <span className="font-label-caps text-xs text-foreground">{t('product.selectColor')}: {selectedColor}</span>
                <div className="flex gap-sm">
                  {product.colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        setSelectedColor(color);
                        setSelectedImage(getColorDefaultImage(color, product.images));
                      }}
                      className={`px-4 py-2 border font-label-caps text-[10px] rounded transition-all ${
                        selectedColor === color
                          ? 'border-tertiary text-tertiary bg-tertiary/5'
                          : 'border-outline-variant text-on-surface-variant hover:border-foreground hover:text-foreground'
                      }`}
                    >
                      {(color || '').toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size Selector */}
            <div className="space-y-md">
              <div className="flex justify-between items-center">
                <span className="font-label-caps text-xs text-foreground">{t('product.selectSize')}</span>
                <button className="text-[10px] font-label-caps text-on-surface-variant/60 underline hover:text-tertiary transition-colors">
                  {t('product.sizeGuide')}
                </button>
              </div>
              <div className="grid grid-cols-5 gap-sm">
                {product.sizes.map((size) => (
                  <button 
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`h-12 border flex items-center justify-center font-label-caps text-xs rounded transition-all ${
                      selectedSize === size
                        ? 'border-tertiary bg-tertiary text-black'
                        : 'border-outline-variant text-foreground hover:border-foreground'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Add to Cart & Wishlist Actions */}
            <div className="flex gap-md pt-md">
              <button 
                onClick={handleAddToCart}
                disabled={product.stockQuantity === 0}
                className={`flex-1 h-14 transition-all font-button text-xs uppercase tracking-widest rounded ${
                  product.stockQuantity === 0
                    ? 'bg-foreground/5 border border-outline-variant text-foreground/30 cursor-not-allowed'
                    : 'bg-white text-black hover:bg-tertiary'
                }`}
              >
                {product.stockQuantity === 0 ? t('product.outOfStock') : t('product.addToCart')}
              </button>
              <button 
                onClick={handleWishlistToggle}
                className="w-14 h-14 border border-outline-variant hover:border-foreground flex items-center justify-center transition-colors rounded text-foreground group"
                title={hasItem(product.id) ? "Remove from wishlist" : "Add to wishlist"}
              >
                <Heart className={`h-6 w-6 ${hasItem(product.id) ? 'fill-red-500 text-red-500' : 'text-foreground'}`} />
              </button>
            </div>

            {/* Details Dropdown Accordion */}
            <div className="pt-xl divide-y divide-outline-variant border-t border-outline-variant">
              
              <details className="group py-md" open>
                <summary className="flex justify-between items-center list-none cursor-pointer text-foreground">
                  <span className="font-label-caps text-xs">{t('product.materialSpecs')}</span>
                  <ChevronDown className="h-5 w-5 transition-transform group-open:rotate-180" />
                </summary>
                <div className="pt-md text-on-surface-variant text-xs space-y-sm font-sans normal-case">
                  {product.specs.map((spec, index) => (
                    <p key={index}>• {spec}</p>
                  ))}
                  {!product.specs.length && <p>• High-performance technical elastic weave.</p>}
                </div>
              </details>

              <details className="group py-md">
                <summary className="flex justify-between items-center list-none cursor-pointer text-foreground">
                  <span className="font-label-caps text-xs">{t('product.fitSizing')}</span>
                  <ChevronDown className="h-5 w-5 transition-transform group-open:rotate-180" />
                </summary>
                <div className="pt-md text-on-surface-variant text-xs font-sans normal-case leading-relaxed">
                  <p>{product.fit || 'Athletic fit. Sized anatomically to move with your body during active performance. We recommend sizing up if you prefer a looser feel.'}</p>
                </div>
              </details>

              <details className="group py-md">
                <summary className="flex justify-between items-center list-none cursor-pointer text-foreground">
                  <span className="font-label-caps text-xs">{t('product.careInstructions')}</span>
                  <ChevronDown className="h-5 w-5 transition-transform group-open:rotate-180" />
                </summary>
                <div className="pt-md text-on-surface-variant text-xs font-sans normal-case leading-relaxed">
                  <p>{product.care || 'Machine wash cold inside out with similar colors. Do not bleach. Tumble dry low. Do not iron branding overlays.'}</p>
                </div>
              </details>

            </div>

          </div>
        </section>

        {/* Reviews Section */}
        <section className="border-t border-outline-variant pt-xxl space-y-xl">
          <div className="flex flex-col md:flex-row justify-between items-end gap-lg border-b border-outline-variant pb-lg">
            <div className="space-y-sm">
              <h2 className="font-headline-lg text-balance text-xl md:text-2xl text-foreground uppercase">{t('product.reviewsTitle')}</h2>
              <div className="flex items-center gap-md">
                <div className="flex text-tertiary">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-tertiary text-tertiary" />
                  ))}
                </div>
                <span className="font-body-md text-sm text-foreground">
                  4.8 / 5.0 (124 {locale === 'ar' ? 'تقييمًا' : 'reviews'})
                </span>
              </div>
            </div>
            <button className="h-12 px-8 border border-foreground hover:bg-foreground hover:text-background font-button text-xs uppercase transition-all rounded">
              {t('product.writeReview')}
            </button>
          </div>

          {/* Customer Gym Photo Stream */}
          <div className="space-y-md">
            <h4 className="font-label-caps text-[10px] text-on-surface-variant/50">{t('product.photoStream')}</h4>
            <div className="flex gap-md overflow-x-auto no-scrollbar pb-md">
              {[
                "/products/Tops%20%26%20Tees/Apex-Compression-Tee-Black-cover.png",
                "/products/Tops%20%26%20Tees/FlexCore-Tank-Top-Black-cover.png",
                "/products/Bottoms%20%26%20Joggers/Velocity-Training-Pants-cover.png",
                "/products/Footwear/PowerStride-Shoes-cover.png"
              ].map((img, idx) => (
                <div key={idx} className="w-40 h-40 rounded-lg overflow-hidden bg-surface-low border border-outline-variant shrink-0 group relative">
                  <SafeImage className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" src={img} alt={`Athlete submission ${idx + 1}`} />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2 pointer-events-none">
                    <span className="text-[9px] font-label-caps text-white">#APEXLUXE</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonial Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-lg pt-md">
            <div className="p-lg bg-surface-low border border-outline-variant space-y-md rounded-xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-button text-sm text-foreground uppercase">Marcus V.</p>
                  <p className="text-[10px] text-tertiary font-label-caps">{t('product.verifiedPurchase')}</p>
                </div>
                <div className="flex text-tertiary">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-tertiary text-tertiary" />
                  ))}
                </div>
              </div>
              <p className="font-body-md text-xs text-on-surface-variant font-sans normal-case leading-relaxed">
                &quot;The compression level is perfect. Most shirts lose their shape after a few washes, but this feels just as tight as day one. Expensive, but you get what you pay for.&quot;
              </p>
            </div>

            <div className="p-lg bg-surface-low border border-outline-variant space-y-md rounded-xl">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-button text-sm text-foreground uppercase">James T.</p>
                  <p className="text-[10px] text-tertiary font-label-caps">{t('product.verifiedPurchase')}</p>
                </div>
                <div className="flex text-tertiary">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < 4 ? 'fill-tertiary text-tertiary' : 'text-tertiary'}`} />
                  ))}
                </div>
              </div>
              <p className="font-body-md text-xs text-on-surface-variant font-sans normal-case leading-relaxed">
                &quot;Excellent moisture wicking during high-intensity sessions. Fits slightly small so if you&apos;re between sizes, definitely go up. Aesthetic is 10/10.&quot;
              </p>
            </div>
          </div>
        </section>

        {/* AI Powered Recommendations Suite */}
        <section className="border-t border-outline-variant pt-xxl space-y-xl">
          <div className="flex items-center justify-between border-b border-outline-variant pb-md">
            <div className="flex items-center gap-sm">
              <Sparkles className="h-5 w-5 text-violet-400 animate-pulse" />
              <h2 className="font-headline-lg text-balance text-xl md:text-2xl text-foreground uppercase tracking-tight">{t('product.aiRecommendations')}</h2>
            </div>
            <button 
              onClick={openAIStylist}
              className="text-xs font-label-caps text-violet-400 hover:underline flex items-center gap-1.5"
            >
              {t('assistant.concierge')}
            </button>
          </div>

          <div className="space-y-12">
            {/* Frequently Bought Together (Checked Bundle Add) */}
            <FrequentlyBoughtTogether productId={product.id} />

            {/* Complete The Look Outfit Suggestions */}
            <CompleteTheLookCarousel productId={product.id} />

            {/* Related Products Carousel */}
            <RelatedProductsCarousel productId={product.id} />
          </div>
        </section>

      </main>

    </div>
  );
}
