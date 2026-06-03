'use client';

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, CheckCircle2, Shield, Sparkles, Store, Cpu, ArrowRight, Loader2 } from 'lucide-react';
import { useProductsQuery } from '../hooks/useProducts';
import { useCart } from '../hooks/useCart';
import { Product } from '../types/index';
import { SafeImage } from '../components/SafeImage';
import { TrendingProductsCarousel, PersonalizedRecommendations } from '../components/recommendations';
import { useTranslation } from '../providers/I18nProvider';
import { useCurrency } from '../providers/CurrencyProvider';
import { useAuthStore } from '../store';
import { apiClient, getErrorMessage } from '../lib/api-client';
import { useHydrated } from '../hooks/useHydrated';

export default function LandingPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const { locale, t } = useTranslation();
  const { formatPrice, usdToActive } = useCurrency();
  const scrollRef = useRef<HTMLDivElement>(null);

  // States
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);
  const [loadingTenant, setLoadingTenant] = useState(true);
  const [tenantDetails, setTenantDetails] = useState<any>(null);
  const [cmsContent, setCmsContent] = useState<any>(null);

  // Store Builder Form States
  const [storeName, setStoreName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [builderLoading, setBuilderLoading] = useState(false);
  const [builderSuccess, setBuilderSuccess] = useState<string | null>(null);
  const [builderError, setBuilderError] = useState<string | null>(null);

  const { data: products = [] } = useProductsQuery({ sort: 'newest' });
  const { addToCart } = useCart();
  const storeCurrentUser = useAuthStore((state) => state.currentUser);
  const [personalizedBanner, setPersonalizedBanner] = useState<{ title: string; subtitle: string } | null>(null);

  // Resolve subdomain/tenant
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      const parts = hostname.split('.');
      let slug: string | null = null;

      if (parts.length > 1) {
        if (hostname.endsWith('localhost') || hostname.endsWith('apexluxe.com')) {
          const sub = parts[0];
          if (sub !== 'www' && sub !== 'platform') {
            slug = sub;
          }
        } else {
          slug = hostname;
        }
      }

      setTenantSlug(slug);

      if (slug) {
        // Fetch Tenant Details & CMS Content
        Promise.all([
          apiClient.get('/saas/tenant/details', { headers: { 'X-Tenant-Id': slug } }),
          apiClient.get('/saas/cms', { headers: { 'X-Tenant-Id': slug } })
        ])
          .then(([detailsRes, cmsRes]) => {
            setTenantDetails(detailsRes.data);
            setCmsContent(cmsRes.data);
          })
          .catch((err) => {
            console.error('Failed to load store information:', err);
          })
          .finally(() => {
            setLoadingTenant(false);
          });
      } else {
        setLoadingTenant(false);
      }
    }
  }, []);

  // Personalization banner
  useEffect(() => {
    if (storeCurrentUser && tenantSlug) {
      apiClient.get('/personalization/banners')
        .then(res => {
          if (res.data && res.data.title) {
            setPersonalizedBanner({
              title: res.data.title,
              subtitle: res.data.subtitle
            });
          }
        })
        .catch(() => {
          setPersonalizedBanner(null);
        });
    } else {
      setPersonalizedBanner(null);
    }
  }, [storeCurrentUser, tenantSlug]);

  const lLink = (path: string) => {
    if (path.startsWith('/en') || path.startsWith('/ar')) return path;
    const base = path === '/' ? '' : path;
    return `/${locale}${base}`;
  };

  const handleQuickAdd = async (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    const defaultSize = product.sizes[0] || 'L';
    const defaultColor = product.colors[0] || 'Onyx Black';
    await addToCart({ product, quantity: 1, size: defaultSize, color: defaultColor });
    const btn = e.currentTarget as HTMLButtonElement;
    btn.innerText = t('home.added');
    btn.style.backgroundColor = 'var(--tertiary)';
    btn.style.color = '#000000';
    setTimeout(() => {
      btn.innerText = t('home.quickAdd');
      btn.style.backgroundColor = '#ffffff';
      btn.style.color = '#000000';
    }, 1500);
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollMultiplier = locale === 'ar' ? -1 : 1;
      const scrollAmount = clientWidth * 0.75 * scrollMultiplier;
      const scrollTo = direction === 'left' 
        ? scrollLeft - scrollAmount 
        : scrollLeft + scrollAmount;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  // Store Builder Submission
  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setBuilderLoading(true);
    setBuilderError(null);
    setBuilderSuccess(null);

    try {
      // 1. Create a user account if not logged in, or use current user
      let userId = storeCurrentUser?.id;
      if (!userId) {
        const registerRes = await apiClient.post('/auth/register', {
          email: adminEmail,
          password: adminPassword,
          name: `${storeName} Admin`,
        });
        userId = registerRes.data.user.id;
      }

      // 2. Build tenant store
      const tenantRes = await apiClient.post('/saas/tenant', {
        name: storeName,
        subdomain: subdomain.toLowerCase().replace(/[^a-z0-9-]/g, ''),
        ownerUserId: userId,
      });

      const newSubdomain = tenantRes.data.subdomain;
      setBuilderSuccess(newSubdomain);
      
      // Auto upgrade input if local development
      showToast?.('STORE CREATED SUCCESSFULLY!', 'success');
    } catch (err: unknown) {
      setBuilderError(getErrorMessage(err));
    } finally {
      setBuilderLoading(false);
    }
  };

  // Toast notifier helper
  const showToast = (msg: string, type: 'success' | 'error') => {
    console.log(`[Toast] ${type.toUpperCase()}: ${msg}`);
  };

  // loading spinner
  if (loadingTenant) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background min-h-[500px]">
        <Loader2 className="w-10 h-10 text-tertiary animate-spin mb-md" />
        <p className="text-on-surface-variant text-xs uppercase tracking-wider font-label-caps">Loading Store Experience...</p>
      </div>
    );
  }

  // RENDER DYNAMIC STOREFRONT HOMEPAGE
  if (tenantSlug && tenantDetails) {
    const banners = cmsContent?.banners || [];
    const activeBanner = banners.find((b: any) => b.isActive) || {
      title: tenantDetails.name,
      subtitle: 'Technical premium activewear ecosystem.',
      imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1600&q=80',
    };

    const newArrivals = products.filter((p) => p.isNew).slice(0, 6);

    return (
      <div className="bg-background text-foreground overflow-x-hidden">
        {/* 1. Dynamic Hero Banner */}
        <section className="relative h-[calc(100vh-80px)] min-h-[700px] flex items-center justify-start px-6 md:px-margin-desktop overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img 
              className="w-full h-full object-cover grayscale opacity-60" 
              src={activeBanner.imageUrl} 
              alt={activeBanner.title}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>
          </div>

          <div className="relative z-10 max-w-2xl space-y-lg text-start">
            <p className="font-label-caps text-label-caps text-tertiary tracking-[0.3em] text-xs">
              {tenantDetails.name.toUpperCase()} / {t('home.engineeredForExcellence')}
            </p>
            <h1 className="font-display-lg text-balance text-4xl sm:text-6xl md:text-7xl uppercase leading-none text-foreground font-black">
              {personalizedBanner?.title || activeBanner.title}
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-lg text-base md:text-lg leading-relaxed">
              {personalizedBanner?.subtitle || activeBanner.subtitle}
            </p>
            <div className="flex flex-wrap gap-md pt-lg">
              <Link href={lLink('/shop')} className="bg-white text-black hover:bg-tertiary transition-all px-8 py-4 font-button text-button uppercase rounded whitespace-nowrap">
                {t('home.shopNow')}
              </Link>
            </div>
          </div>
        </section>

        {/* Curated Catalog Bento Grid */}
        <section className="py-xxl px-6 md:px-margin-desktop max-w-container-max mx-auto">
          <div className="flex justify-between items-end mb-xl">
            <div>
              <p className="font-label-caps text-label-caps text-on-surface-variant mb-xs text-xs">{t('nav.collections')}</p>
              <h2 className="font-headline-lg text-balance text-2xl md:text-3xl text-foreground uppercase tracking-tight font-bold">{t('home.featured')}</h2>
            </div>
            <Link href={lLink('/shop')} className="font-label-caps text-label-caps text-tertiary hover:underline text-xs">{t('nav.shop')}</Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter h-[450px]">
            <div className="group relative overflow-hidden bg-surface-lowest rounded-xl border border-white/5">
              <img 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuA_y5mZZv_nYIOi0o7RI9YBw62pqv4e-Nz4aHwvF4hzY9ffc99Fx0vFpWgka3V72AwPCIkx9HF-orcQ8ubigeIX8w6sbJsUs0TCZNqXWw4GQSFjwW964yFfyEpNZrzkvitzH-V79MXbDKiZxpC8fGNwBI82Fryr4PPOnA0ptEYoZZXtb_t9B-8dNwS3F80aj-j70bGQX18EnkVkPHewL_x1QvFUazhYHW-iposlrcGa6VLw_AhLHhrdnaCW_QPsNjvDmv_ofAjjvKuI" 
                alt="High performance apparel"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col justify-end p-8 text-start">
                <h3 className="font-headline-xl text-3xl mb-xs text-white font-bold">{t('home.coreCompression')}</h3>
                <Link href={lLink('/shop')} className="font-button text-button border-b border-white hover:border-tertiary hover:text-tertiary w-fit pb-1 transition-colors uppercase">{t('home.shopNow')}</Link>
              </div>
            </div>
            <div className="group relative overflow-hidden bg-surface-lowest rounded-xl border border-white/5">
              <img 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBrhSw6vM5mx91k9cEVUoYG-DH1sMUZTXCP1sj0XqKoa5S7E4QZJczw6GkmZLKBkLvV6HqLumT__QVhvlSeX3kTKh5DjVo4MFEkehV5grHALQC998I9jZ81V9lxawhsjAD5fPWwIozQlR8NKsuhjRw7KwioXuysM_nODvrIM33cqTsJOf1pOJO1-LLCb5wMJARswbIalrT5suq5C8N24Av-ssPriGyWah8ev43eGwWmvA06JVc103W6PG0pZ_WqCXcw4yX7rDC3Atns" 
                alt="Technical lifestyle activewear"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col justify-end p-8 text-start">
                <h3 className="font-headline-xl text-3xl mb-xs text-white font-bold">{t('home.aestheticThermal')}</h3>
                <Link href={lLink('/shop')} className="font-button text-button border-b border-white hover:border-tertiary hover:text-tertiary w-fit pb-1 transition-colors uppercase">{t('home.shopNow')}</Link>
              </div>
            </div>
          </div>
        </section>

        {/* New Arrivals Horizontal Scroll */}
        <section className="py-xxl bg-surface-lowest border-y border-outline-variant">
          <div className="px-6 md:px-margin-desktop max-w-container-max mx-auto mb-xl flex justify-between items-center">
            <h2 className="font-headline-lg text-balance text-2xl md:text-3xl text-foreground uppercase tracking-tight font-bold">{t('home.newArrivals')}</h2>
            <div className="flex gap-md">
              <button onClick={() => scroll('left')} className="w-12 h-12 rounded-full border border-outline-variant flex items-center justify-center hover:border-tertiary transition-colors"><ChevronLeft className="text-foreground" /></button>
              <button onClick={() => scroll('right')} className="w-12 h-12 rounded-full border border-outline-variant flex items-center justify-center hover:border-tertiary transition-colors"><ChevronRight className="text-foreground" /></button>
            </div>
          </div>

          <div ref={scrollRef} className="flex gap-gutter overflow-x-auto no-scrollbar px-6 md:px-margin-desktop scroll-smooth">
            {newArrivals.map((product) => (
              <div key={product.id} onClick={() => router.push(`/${locale}/product/${product.slug || product.id}`)} className="min-w-[280px] sm:min-w-[340px] max-w-[340px] group cursor-pointer space-y-md text-start">
                <div className="aspect-[4/5] bg-surface relative overflow-hidden rounded-lg border border-outline-variant">
                  <SafeImage className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" src={product.images[0]} alt={product.name} />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button onClick={(e) => handleQuickAdd(e, product)} className="bg-white text-black px-6 py-3 font-button text-xs rounded hover:bg-tertiary transition-all font-bold">{t('home.quickAdd')}</button>
                  </div>
                </div>
                <div className="space-y-xs">
                  <p className="font-label-caps text-outline text-[10px]">{product.category}</p>
                  <h4 className="font-headline-lg text-base text-foreground group-hover:text-tertiary transition-colors uppercase font-bold">{product.name}</h4>
                  <p className="font-body-md text-on-surface-variant">{formatPrice(usdToActive(product.price))}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* AI widgets */}
        <section className="py-xxl px-6 md:px-margin-desktop max-w-container-max mx-auto space-y-12">
          <PersonalizedRecommendations />
          <TrendingProductsCarousel />
        </section>
      </div>
    );
  }

  // RENDER SAAS PLATFORM LANDING PAGE (ROOT DOMAIN)
  return (
    <div className="bg-background text-foreground font-sans overflow-x-hidden min-h-screen">
      {/* Hero Header */}
      <section className="relative py-32 px-6 md:px-12 max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-16 overflow-hidden">
        {/* Glow */}
        <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-tertiary/20 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-2xl space-y-lg text-start lg:w-1/2">
          <div className="inline-flex items-center gap-2 bg-foreground/5 border border-outline-variant rounded-full px-4 py-1.5 text-xs text-tertiary font-label-caps tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" /> {t('saas.nextGen')}
          </div>
          <h1 className="font-display-lg text-balance text-4xl sm:text-6xl md:text-7xl uppercase leading-none text-foreground font-black tracking-tight">
            {t('saas.launchBrand').split(' ').slice(0, -2).join(' ')} <span className="text-tertiary">{t('saas.launchBrand').split(' ').slice(-2).join(' ')}</span>
          </h1>
          <p className="text-on-surface-variant font-body-lg text-sm sm:text-base leading-relaxed max-w-lg">
            {t('saas.deployStores')}
          </p>

          <div className="flex flex-wrap gap-4 pt-6">
            <a href="#store-builder" className="bg-tertiary text-black hover:brightness-105 transition-all px-8 py-4 font-button text-xs uppercase tracking-wider rounded font-bold inline-flex items-center gap-xs">
              {t('saas.buildNow')} <ArrowRight className="w-4 h-4" />
            </a>
            <a href="#pricing" className="border border-outline-variant text-foreground hover:bg-foreground/5 transition-all px-8 py-4 font-button text-xs uppercase tracking-wider rounded font-bold">
              {t('saas.viewPlans')}
            </a>
          </div>
        </div>

        {/* Store Builder UI panel */}
        <div id="store-builder" className="lg:w-1/2 w-full max-w-md luxury-glass p-6 md:p-8 rounded-2xl border border-outline-variant shadow-2xl relative">
          <div className="absolute top-0 right-0 transform translate-x-3 -translate-y-3 bg-tertiary text-black text-[9px] font-label-caps font-bold px-3 py-1 rounded-full flex items-center gap-1">
            <Store className="w-3 h-3" /> {t('saas.liveCreator')}
          </div>

          <h2 className="font-headline-lg text-lg text-foreground uppercase border-b border-outline-variant pb-2 text-start flex items-center gap-2">
            {t('saas.storeBuilder')}
          </h2>
          <p className="text-on-surface-variant text-xs mt-1 text-start">{t('saas.provisionDesc')}</p>

          <form onSubmit={handleCreateStore} className="space-y-md mt-6 text-start font-sans text-xs">
            {builderSuccess ? (
              <div className="p-6 bg-tertiary/10 border border-tertiary/20 rounded-xl space-y-md text-center">
                <CheckCircle2 className="w-12 h-12 text-tertiary mx-auto" />
                <h3 className="font-bold text-foreground uppercase text-sm">{t('saas.provisionSuccess')}</h3>
                <p className="text-on-surface-variant text-xs">{t('saas.provisionSuccessDesc')}</p>
                <div className="p-3 bg-foreground/5 border border-outline-variant rounded font-mono text-foreground text-[11px]">
                  http://{builderSuccess}.localhost:3000
                </div>
                <div className="pt-2">
                  <a
                    href={`http://${builderSuccess}.localhost:3000/auth/login`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-white text-black font-button text-xs py-3 rounded hover:bg-tertiary transition-all inline-block font-bold text-center"
                  >
                    {t('saas.goLogin')} &rarr;
                  </a>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <label className="text-[10px] font-label-caps text-outline">{t('saas.storeName')}</label>
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder={t('saas.storeNamePlaceholder')}
                    className="w-full bg-foreground/[0.03] border border-outline-variant rounded px-4 py-3 text-foreground focus:border-tertiary focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-label-caps text-outline">{t('saas.addressSubdomain')}</label>
                  <div className="flex items-center">
                    <input
                      type="text"
                      required
                      value={subdomain}
                      onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder={t('saas.subdomainPlaceholder')}
                      className="flex-1 bg-foreground/[0.03] border border-outline-variant rounded-l px-4 py-3 text-foreground focus:border-tertiary focus:outline-none transition-colors"
                    />
                    <span className="bg-foreground/5 border-y border-r border-outline-variant px-4 py-3 rounded-r text-on-surface-variant font-mono">
                      .localhost:3000
                    </span>
                  </div>
                </div>

                {!storeCurrentUser && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-label-caps text-outline">{t('saas.adminEmail')}</label>
                      <input
                        type="email"
                        required
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder={t('saas.adminEmailPlaceholder')}
                        className="w-full bg-foreground/[0.03] border border-outline-variant rounded px-4 py-3 text-foreground focus:border-tertiary focus:outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-label-caps text-outline">{t('saas.adminPassword')}</label>
                      <input
                        type="password"
                        required
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder={t('saas.passwordPlaceholder')}
                        className="w-full bg-foreground/[0.03] border border-outline-variant rounded px-4 py-3 text-foreground focus:border-tertiary focus:outline-none transition-colors"
                      />
                    </div>
                  </>
                )}

                {builderError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded text-[11px] leading-normal font-sans">
                    {builderError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={builderLoading}
                  className="w-full bg-tertiary text-black font-button text-xs py-3.5 rounded hover:brightness-105 active:scale-[0.98] transition-all font-bold flex items-center justify-center gap-xs uppercase tracking-wider"
                >
                  {builderLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Store className="w-4 h-4" />}
                  {t('saas.deployButton')}
                </button>
              </>
            )}
          </form>
        </div>
      </section>

      {/* Pricing Grid Section */}
      <section id="pricing" className="py-24 border-t border-outline-variant relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center space-y-md mb-16">
            <p className="font-label-caps text-xs text-tertiary tracking-widest">{t('saas.flexibleTiering')}</p>
            <h2 className="font-display-lg text-foreground uppercase text-3xl md:text-5xl font-black">{t('saas.choosePlan')}</h2>
            <p className="text-on-surface-variant max-w-xl mx-auto text-xs sm:text-sm font-sans leading-relaxed">
              {t('saas.tieringDesc')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter font-sans">
            {/* Starter */}
            <div className="luxury-glass p-8 rounded-2xl border border-outline-variant flex flex-col justify-between text-start relative">
              <div className="space-y-sm">
                <span className="text-[10px] font-label-caps text-outline">{t('saas.starterPlan')}</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-foreground font-display-lg">{formatPrice(usdToActive(49))}</span>
                  <span className="text-on-surface-variant text-xs">/mo</span>
                </div>
                <p className="text-[11px] text-on-surface-variant/70 leading-relaxed pt-2">
                  {t('saas.starterDesc')}
                </p>
                <div className="w-full h-px bg-outline-variant my-4"></div>
                <ul className="space-y-3 text-xs text-foreground/80">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-tertiary flex-shrink-0" /> {t('saas.maxProducts').replace('{count}', '100')}</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-tertiary flex-shrink-0" /> {t('saas.warehouseCount').replace('{count}', '1')}</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-tertiary flex-shrink-0" /> {t('saas.stdTheme')}</li>
                  <li className="flex items-center gap-2 text-foreground/40"><CheckCircle2 className="w-4 h-4 text-outline-variant flex-shrink-0" /> {t('saas.noCustomDomains')}</li>
                  <li className="flex items-center gap-2 text-foreground/40"><CheckCircle2 className="w-4 h-4 text-outline-variant flex-shrink-0" /> {t('saas.noAiFeatures')}</li>
                </ul>
              </div>
            </div>

            {/* Growth */}
            <div className="luxury-glass p-8 rounded-2xl border border-tertiary/25 flex flex-col justify-between text-start relative">
              <div className="absolute top-0 right-0 transform translate-y-[-50%] bg-tertiary text-black text-[9px] font-bold px-3 py-1 rounded-full font-label-caps uppercase tracking-wider">
                {t('saas.popular')}
              </div>
              <div className="space-y-sm">
                <span className="text-[10px] font-label-caps text-tertiary">{t('saas.growthPlan')}</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-foreground font-display-lg">{formatPrice(usdToActive(149))}</span>
                  <span className="text-on-surface-variant text-xs">/mo</span>
                </div>
                <p className="text-[11px] text-on-surface-variant/70 leading-relaxed pt-2">
                  {t('saas.growthDesc')}
                </p>
                <div className="w-full h-px bg-outline-variant my-4"></div>
                <ul className="space-y-3 text-xs text-foreground/80">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-tertiary flex-shrink-0" /> {t('saas.maxProducts').replace('{count}', '500')}</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-tertiary flex-shrink-0" /> {t('saas.warehouseLocations').replace('{count}', '2')}</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-tertiary flex-shrink-0" /> {t('saas.sslCustomDomains')}</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-tertiary flex-shrink-0" /> {t('saas.premTheme')}</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-tertiary flex-shrink-0" /> {t('saas.basicAi')}</li>
                </ul>
              </div>
            </div>

            {/* Pro */}
            <div className="luxury-glass p-8 rounded-2xl border border-outline-variant flex flex-col justify-between text-start relative">
              <div className="space-y-sm">
                <span className="text-[10px] font-label-caps text-outline">{t('saas.proPlan')}</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-foreground font-display-lg">{formatPrice(usdToActive(499))}</span>
                  <span className="text-on-surface-variant text-xs">/mo</span>
                </div>
                <p className="text-[11px] text-on-surface-variant/70 leading-relaxed pt-2">
                  {t('saas.proDesc')}
                </p>
                <div className="w-full h-px bg-outline-variant my-4"></div>
                <ul className="space-y-3 text-xs text-foreground/80">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-tertiary flex-shrink-0" /> {t('saas.maxProducts').replace('{count}', '2000')}</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-tertiary flex-shrink-0" /> {t('saas.warehouseLocations').replace('{count}', '5')}</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-tertiary flex-shrink-0" /> {t('saas.sslCustomDomains')}</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-tertiary flex-shrink-0" /> {t('saas.themeOverrides')}</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-tertiary flex-shrink-0" /> {t('saas.fullAiSuite')}</li>
                </ul>
              </div>
            </div>

            {/* Enterprise */}
            <div className="luxury-glass p-8 rounded-2xl border border-outline-variant flex flex-col justify-between text-start relative">
              <div className="space-y-sm">
                <span className="text-[10px] font-label-caps text-outline">{t('saas.entPlan')}</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-foreground font-display-lg">{formatPrice(usdToActive(1999))}</span>
                  <span className="text-on-surface-variant text-xs">/mo</span>
                </div>
                <p className="text-[11px] text-on-surface-variant/70 leading-relaxed pt-2">
                  {t('saas.entDesc')}
                </p>
                <div className="w-full h-px bg-outline-variant my-4"></div>
                <ul className="space-y-3 text-xs text-foreground/80">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-tertiary flex-shrink-0" /> {t('saas.unlimitedProducts')}</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-tertiary flex-shrink-0" /> {t('saas.unlimitedWarehouses')}</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-tertiary flex-shrink-0" /> {t('saas.multipleCustomDomains')}</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-tertiary flex-shrink-0" /> {t('saas.customThemeOverrides')}</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-tertiary flex-shrink-0" /> {t('saas.prioritySla')}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="py-24 bg-foreground/[0.01] border-t border-outline-variant">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 text-start font-sans text-xs">
          <div className="space-y-xs">
            <Cpu className="w-8 h-8 text-tertiary mb-md" />
            <h3 className="text-foreground font-bold uppercase text-sm">{t('saas.tenantIsolation')}</h3>
            <p className="text-on-surface-variant leading-relaxed">
              {t('saas.tenantIsolationDesc')}
            </p>
          </div>
          <div className="space-y-xs">
            <Shield className="w-8 h-8 text-tertiary mb-md" />
            <h3 className="text-foreground font-bold uppercase text-sm">{t('saas.stripeSaaS')}</h3>
            <p className="text-on-surface-variant leading-relaxed">
              {t('saas.stripeSaaSDesc')}
            </p>
          </div>
          <div className="space-y-xs">
            <Store className="w-8 h-8 text-tertiary mb-md" />
            <h3 className="text-foreground font-bold uppercase text-sm">{t('saas.customDomainThemes')}</h3>
            <p className="text-on-surface-variant leading-relaxed">
              {t('saas.customDomainThemesDesc')}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
