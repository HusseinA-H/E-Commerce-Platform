'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  TrendingUp,
  ShoppingBag,
  Heart,
  ChevronRight,
  Plus,
  Info,
  CheckCircle,
  Eye,
  Award,
  Layers,
  Zap,
  Lock
} from 'lucide-react';
import { apiClient } from '../lib/api-client';
import { useAuthStore, useCartStore } from '../store';
import { Product } from '../types/index';
import { mapBackendProductToFrontend } from '../lib/mappers';
import { useTranslation } from '../providers/I18nProvider';
import { useCurrency } from '../providers/CurrencyProvider';

interface RecItem {
  productId: string;
  reason: string;
  matchScore: number;
  product: Product;
}

// Log CTR click telemetry helper
const logRecommendationClick = async (productId: string, engineType: string, userId?: string) => {
  try {
    await apiClient.post('/recommendations/event', {
      productId,
      engineType,
      eventType: 'click',
      userId,
    });
  } catch (e) {
    // Fail silently in telemetry
  }
};

// 1. Related Products Carousel
export function RelatedProductsCarousel({ productId }: { productId: string }) {
  const { currentUser } = useAuthStore();
  const { locale, t } = useTranslation();
  const { formatPrice, usdToActive } = useCurrency();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRelated = async () => {
      try {
        const res = await apiClient.get(`/recommendations/related/${productId}`);
        setProducts((res.data || []).map(mapBackendProductToFrontend));
      } catch (e) {
        console.warn('Failed to load related products.');
      } finally {
        setLoading(false);
      }
    };
    fetchRelated();
  }, [productId]);

  if (loading) {
    return <div className="h-48 flex items-center justify-center"><Zap className="animate-pulse text-violet-500" /></div>;
  }

  if (products.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-violet-400" /> {t('product.relatedGarments')}
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map((p) => (
          <motion.a
            key={p.id}
            href={`/${locale}/product/${p.slug || p.id}`}
            onClick={() => logRecommendationClick(p.id, 'related', currentUser?.id)}
            whileHover={{ y: -4 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col justify-between hover:border-violet-500/30 transition-all group"
          >
            <div>
              <div className="aspect-square bg-neutral-900 rounded-xl overflow-hidden mb-2">
                <img
                  src={p.images?.[0] || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600'}
                  alt={p.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <span className="text-[10px] text-violet-400 font-bold uppercase tracking-wider">
                {p.category || 'Sportswear'}
              </span>
              <h4 className="font-bold text-xs text-neutral-200 line-clamp-1 mt-0.5 group-hover:text-white transition-colors">
                {p.name}
              </h4>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
              <span className="text-xs font-bold text-white">{formatPrice(usdToActive(p.price))}</span>
              <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors" />
            </div>
          </motion.a>
        ))}
      </div>
    </div>
  );
}

// 2. Complete The Look Carousel
export function CompleteTheLookCarousel({ productId }: { productId: string }) {
  const { currentUser } = useAuthStore();
  const { locale, t } = useTranslation();
  const { formatPrice, usdToActive } = useCurrency();
  const [recs, setRecs] = useState<RecItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComplete = async () => {
      try {
        const res = await apiClient.get(`/recommendations/complete-the-look/${productId}`);
        const mapped = (res.data || []).map((item: any) => ({
          productId: item.productId,
          reason: item.reason,
          matchScore: item.matchScore,
          product: mapBackendProductToFrontend(item.product),
        }));
        setRecs(mapped);
      } catch (e) {
        console.warn('Failed to load complete the look coordinates.');
      } finally {
        setLoading(false);
      }
    };
    fetchComplete();
  }, [productId]);

  if (loading) return null;
  if (recs.length === 0) return null;

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/5 rounded-full blur-2xl pointer-events-none" />
      <h3 className="text-xl font-bold tracking-tight text-white mb-4 flex items-center gap-2">
        <Layers className="w-5 h-5 text-violet-400" /> {t('product.completeTheLook')}
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {recs.map((rec) => (
          <div key={rec.productId} className="bg-black/30 border border-white/5 rounded-2xl p-4 flex flex-col justify-between group hover:border-violet-500/20 transition-all">
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <span className="px-2 py-0.5 bg-violet-500/10 border border-violet-500/20 text-[9px] font-bold text-violet-300 rounded-md">
                  {rec.product.category || 'Garment'}
                </span>
                <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-400 rounded-md">
                  {rec.matchScore}% Match
                </span>
              </div>
              <div className="aspect-square bg-neutral-900 rounded-xl overflow-hidden mb-3">
                <img
                  src={rec.product.images?.[0] || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600'}
                  alt={rec.product.name}
                  className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                />
              </div>
              <h4 className="font-bold text-sm text-neutral-200 mt-1">{rec.product.name}</h4>
              <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                {rec.reason}
              </p>
            </div>
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
              <span className="font-bold text-sm text-white">{formatPrice(usdToActive(rec.product.price))}</span>
              <a
                href={`/${locale}/product/${rec.product.slug || rec.product.id}`}
                onClick={() => logRecommendationClick(rec.productId, 'complete_the_look', currentUser?.id)}
                className="px-3.5 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-[11px] font-bold rounded-lg transition-all"
              >
                Buy Piece
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 3. Frequently Bought Together (Bundle adding)
export function FrequentlyBoughtTogether({ productId }: { productId: string }) {
  const { currentUser } = useAuthStore();
  const { addItem } = useCartStore();
  const { locale, t } = useTranslation();
  const { formatPrice, usdToActive } = useCurrency();
  const [bundleProducts, setBundleProducts] = useState<Product[]>([]);
  const [targetProduct, setTargetProduct] = useState<Product | null>(null);
  const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBundle = async () => {
      try {
        const [targetRes, bundleRes] = await Promise.all([
          apiClient.get(`/products/${productId}`),
          apiClient.get(`/recommendations/bought-together/${productId}`),
        ]);
        setTargetProduct(mapBackendProductToFrontend(targetRes.data));
        
        const mappedBundle = (bundleRes.data || []).map(mapBackendProductToFrontend);
        setBundleProducts(mappedBundle);

        // Precheck all products in list
        const checks: Record<string, boolean> = { [productId]: true };
        mappedBundle.forEach((p: Product) => {
          checks[p.id] = true;
        });
        setCheckedIds(checks);
      } catch (e) {
        console.warn('Failed to load frequently bought together bundle.');
      } finally {
        setLoading(false);
      }
    };
    fetchBundle();
  }, [productId]);

  if (loading) return null;
  if (bundleProducts.length === 0 || !targetProduct) return null;

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddBundle = () => {
    let addedCount = 0;
    if (checkedIds[targetProduct.id]) {
      addItem(targetProduct, 1, targetProduct.sizes?.[0] || 'L', targetProduct.colors?.[0] || 'Onyx Black');
      addedCount++;
    }
    bundleProducts.forEach((p) => {
      if (checkedIds[p.id]) {
        addItem(p, 1, p.sizes?.[0] || 'L', p.colors?.[0] || 'Onyx Black');
        logRecommendationClick(p.id, 'bought_together', currentUser?.id);
        apiClient.post('/recommendations/event', {
          productId: p.id,
          engineType: 'bought_together',
          eventType: 'cart_add',
          userId: currentUser?.id,
        }).catch(() => {});
        addedCount++;
      }
    });

    if (addedCount > 0) {
      alert(`Successfully added ${addedCount} bundle coordinates to your cart!`);
    }
  };

  const calculateBundleTotal = () => {
    let sum = 0;
    if (checkedIds[targetProduct.id]) sum += targetProduct.price;
    bundleProducts.forEach((p) => {
      if (checkedIds[p.id]) sum += p.price;
    });
    return sum;
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
      <h3 className="text-xl font-bold tracking-tight text-white mb-4 flex items-center gap-2">
        <Zap className="w-5 h-5 text-violet-400" /> {t('product.boughtTogether')}
      </h3>

      <div className="flex flex-col md:flex-row items-stretch gap-6">
        
        {/* Bundle checklist items */}
        <div className="flex-1 flex flex-wrap items-center gap-4">
          
          {/* Main Product Card */}
          <div className="flex items-center gap-3 bg-black/40 border border-white/5 p-3 rounded-2xl shrink-0">
            <input
              type="checkbox"
              checked={!!checkedIds[targetProduct.id]}
              onChange={() => toggleCheck(targetProduct.id)}
              className="w-4 h-4 accent-violet-600 rounded"
            />
            <div className="w-12 h-12 rounded-lg bg-neutral-900 overflow-hidden border border-white/10">
              <img src={targetProduct.images?.[0]} alt={targetProduct.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-neutral-200 line-clamp-1 max-w-[150px]">{targetProduct.name}</h4>
              <span className="text-xs font-semibold text-violet-400">{formatPrice(usdToActive(targetProduct.price))}</span>
            </div>
          </div>

          {/* Plus symbol */}
          <Plus className="w-4 h-4 text-neutral-500 shrink-0" />

          {/* Recommended bundle items */}
          {bundleProducts.map((p, idx) => (
            <React.Fragment key={p.id}>
              {idx > 0 && <Plus className="w-4 h-4 text-neutral-500 shrink-0" />}
              <div className="flex items-center gap-3 bg-black/40 border border-white/5 p-3 rounded-2xl shrink-0">
                <input
                  type="checkbox"
                  checked={!!checkedIds[p.id]}
                  onChange={() => toggleCheck(p.id)}
                  className="w-4 h-4 accent-violet-600 rounded"
                />
                <div className="w-12 h-12 rounded-lg bg-neutral-900 overflow-hidden border border-white/10">
                  <img src={p.images?.[0]} alt={p.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-neutral-200 line-clamp-1 max-w-[150px]">{p.name}</h4>
                  <span className="text-xs font-semibold text-violet-400">{formatPrice(usdToActive(p.price))}</span>
                </div>
              </div>
            </React.Fragment>
          ))}

        </div>

        {/* Purchase box */}
        <div className="w-full md:w-56 bg-black/40 border border-white/5 p-4 rounded-2xl flex flex-col justify-between shrink-0">
          <div>
            <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold block">Bundle Price</span>
            <span className="text-2xl font-black text-white mt-1 block">{formatPrice(usdToActive(calculateBundleTotal()))}</span>
            <p className="text-[10px] text-neutral-400 mt-1">Coordinated styling engineered for dynamic routines</p>
          </div>
          <button
            onClick={handleAddBundle}
            className="w-full mt-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl text-xs transition-all shadow-md shadow-violet-600/10 hover:scale-[1.02]"
          >
            Add Selected to Cart
          </button>
        </div>

      </div>
    </div>
  );
}

// 4. Trending Products Carousel
export function TrendingProductsCarousel() {
  const { currentUser } = useAuthStore();
  const { locale, t } = useTranslation();
  const { formatPrice, usdToActive } = useCurrency();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const res = await apiClient.get('/recommendations/trending');
        setProducts((res.data || []).map(mapBackendProductToFrontend));
      } catch (e) {
        console.warn('Failed to load trending products.');
      } finally {
        setLoading(false);
      }
    };
    fetchTrending();
  }, []);

  if (loading) return null;
  if (products.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-violet-400" /> {t('product.trendingWeek')}
        </h3>
        <span className="text-xs text-neutral-400 font-medium bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
          Live velocity stats
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map((p) => (
          <motion.a
            key={p.id}
            href={`/${locale}/product/${p.slug || p.id}`}
            onClick={() => logRecommendationClick(p.id, 'trending', currentUser?.id)}
            whileHover={{ y: -4 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col justify-between hover:border-violet-500/30 transition-all group"
          >
            <div>
              <div className="aspect-square bg-neutral-900 rounded-xl overflow-hidden mb-2">
                <img
                  src={p.images?.[0] || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600'}
                  alt={p.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <span className="text-[10px] text-violet-400 font-bold uppercase tracking-wider">
                {p.category || 'Sportswear'}
              </span>
              <h4 className="font-bold text-xs text-neutral-200 line-clamp-1 mt-0.5 group-hover:text-white transition-colors">
                {p.name}
              </h4>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
              <span className="text-xs font-bold text-white">{formatPrice(usdToActive(p.price))}</span>
              <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors" />
            </div>
          </motion.a>
        ))}
      </div>
    </div>
  );
}

// 5. Personalized Recommendations
export function PersonalizedRecommendations() {
  const { currentUser } = useAuthStore();
  const { locale, t } = useTranslation();
  const { formatPrice, usdToActive } = useCurrency();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    const fetchPersonalized = async () => {
      try {
        const res = await apiClient.get('/recommendations/personalized');
        setProducts((res.data || []).map(mapBackendProductToFrontend));
      } catch (e) {
        console.warn('Failed to load personalized recommendations.');
      } finally {
        setLoading(false);
      }
    };
    fetchPersonalized();
  }, [currentUser]);

  if (loading) return null;
  if (!currentUser || products.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
        <Heart className="w-5 h-5 text-violet-400" /> {t('product.recommendedForYou')}
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map((p) => (
          <motion.a
            key={p.id}
            href={`/${locale}/product/${p.slug || p.id}`}
            onClick={() => logRecommendationClick(p.id, 'personalized', currentUser?.id)}
            whileHover={{ y: -4 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col justify-between hover:border-violet-500/30 transition-all group"
          >
            <div>
              <div className="aspect-square bg-neutral-900 rounded-xl overflow-hidden mb-2">
                <img
                  src={p.images?.[0] || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600'}
                  alt={p.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <span className="text-[10px] text-violet-400 font-bold uppercase tracking-wider">
                {p.category || 'Sportswear'}
              </span>
              <h4 className="font-bold text-xs text-neutral-200 line-clamp-1 mt-0.5 group-hover:text-white transition-colors">
                {p.name}
              </h4>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
              <span className="text-xs font-bold text-white">{formatPrice(usdToActive(p.price))}</span>
              <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors" />
            </div>
          </motion.a>
        ))}
      </div>
    </div>
  );
}

// 6. User Style Profile (Style DNA card)
export function StyleDNACard() {
  const { currentUser } = useAuthStore();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    const fetchProfile = async () => {
      try {
        const res = await apiClient.get('/recommendations/style-profile');
        setProfile(res.data);
      } catch (e) {
        console.warn('Failed to load user style profile.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [currentUser]);

  if (loading) return null;

  if (!currentUser) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center backdrop-blur-md relative overflow-hidden flex flex-col items-center justify-center">
        <Lock className="w-8 h-8 text-neutral-500 mb-3" />
        <h3 className="font-bold text-base text-white">{t('product.unlockDna')}</h3>
        <p className="text-neutral-400 text-xs mt-1.5 max-w-xs leading-relaxed">
          {t('product.unlockDnaDesc')}
        </p>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md relative overflow-hidden shadow-xl">
      <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
      
      <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-violet-400" />
          <h3 className="font-bold text-sm tracking-tight text-white uppercase">{t('profile.dnaCard')}</h3>
        </div>
        <span className="px-2 py-0.5 bg-violet-500/20 text-violet-300 border border-violet-500/10 text-[9px] font-bold rounded uppercase">
          {t('profile.confidence')}: {profile.confidenceScore}%
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">{t('profile.dominant')}</span>
          <span className="text-lg font-black text-white mt-0.5 block">{profile.dominantAesthetic}</span>
        </div>

        <div>
          <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">{t('profile.timeline')}</span>
          <p className="text-xs text-neutral-300 leading-relaxed mt-1">{profile.styleEvolution}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div>
            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">{t('profile.palette')}</span>
            <div className="flex gap-1.5 mt-1.5">
              {profile.preferredColors?.split(',').map((color: string, i: number) => (
                <span key={i} className="px-2 py-0.5 bg-black/40 border border-white/10 text-[9px] font-bold rounded">
                  {color.trim()}
                </span>
              ))}
            </div>
          </div>
          <div>
            <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider block">{t('profile.categories')}</span>
            <div className="flex gap-1.5 mt-1.5">
              {profile.preferredCategories?.split(',').map((cat: string, i: number) => (
                <span key={i} className="px-2 py-0.5 bg-black/40 border border-white/10 text-[9px] font-bold rounded text-violet-300">
                  {cat.trim().toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 7. Cart Cross Sells / Accessories Upgrade
export function CartCrossSells({ firstProductId }: { firstProductId?: string }) {
  const { currentUser } = useAuthStore();
  const { locale, t } = useTranslation();
  const { formatPrice, usdToActive } = useCurrency();
  const { addItem } = useCartStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firstProductId) {
      setLoading(false);
      return;
    }
    const fetchCrossSells = async () => {
      try {
        const res = await apiClient.get(`/recommendations/cross/${firstProductId}`);
        setProducts((res.data || []).map(mapBackendProductToFrontend));
      } catch (e) {
        console.warn('Failed to load cart cross-sells.');
      } finally {
        setLoading(false);
      }
    };
    fetchCrossSells();
  }, [firstProductId]);

  if (loading) return null;
  if (products.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold tracking-tight text-white flex items-center gap-2 uppercase">
        <ShoppingBag className="w-5 h-5 text-violet-400" /> {t('product.recommendedAccessories')}
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map((p) => (
          <div
            key={p.id}
            className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col justify-between hover:border-violet-500/30 transition-all group"
          >
            <div>
              <div className="aspect-square bg-neutral-900 rounded-xl overflow-hidden mb-2">
                <img
                  src={p.images?.[0] || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600'}
                  alt={p.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <span className="text-[10px] text-violet-400 font-bold uppercase tracking-wider">
                {p.category || 'Accessories'}
              </span>
              <h4 className="font-bold text-xs text-neutral-200 line-clamp-1 mt-0.5 group-hover:text-white transition-colors">
                {p.name}
              </h4>
            </div>
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
              <span className="text-xs font-bold text-white">{formatPrice(usdToActive(p.price))}</span>
              <button
                onClick={() => {
                  addItem(p, 1, p.sizes?.[0] || 'One Size', p.colors?.[0] || 'Black');
                  logRecommendationClick(p.id, 'cross_sell', currentUser?.id);
                  apiClient.post('/recommendations/event', {
                    productId: p.id,
                    engineType: 'cross_sell',
                    eventType: 'cart_add',
                    userId: currentUser?.id,
                  }).catch(() => {});
                  alert(`${p.name} added to cart!`);
                }}
                className="px-2 py-1 bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-bold rounded transition-all"
              >
                Add
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
