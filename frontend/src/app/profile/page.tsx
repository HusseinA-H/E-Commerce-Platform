'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store';
import { useOrdersQuery } from '../../hooks/useOrders';
import { useUpdateProfileMutation, useLogoutMutation } from '../../hooks/useAuth';
import { ChevronRight, Loader2, Package, Trophy, Crown } from 'lucide-react';
import { StyleDNACard } from '../../components/recommendations';
import { useTranslation } from '../../providers/I18nProvider';
import { useCurrency } from '../../providers/CurrencyProvider';
import { apiClient } from '../../lib/api-client';
import { useLoyaltyAccount } from '../../hooks/useLoyalty';

export default function ProfilePage() {
  const router = useRouter();
  const { locale, t } = useTranslation();
  const { formatPrice } = useCurrency();
  
  // Zustand State
  const currentUser = useAuthStore((state) => state.currentUser);

  // Dynamic API Hooks
  const { data: dbOrders = [] } = useOrdersQuery();
  const { data: loyaltyAccount } = useLoyaltyAccount();
  const updateProfileMutation = useUpdateProfileMutation();
  const logoutMutation = useLogoutMutation();

  // Hydration-safe state synchronization
  const [prevUserEmail, setPrevUserEmail] = useState(currentUser?.email || '');
  const [name, setName] = useState(currentUser?.name || '');
  const [isEditing, setIsEditing] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);

  // Sizing & Fit Preference States
  const [preferredSizes, setPreferredSizes] = useState<string[]>([]);
  const [preferredFits, setPreferredFits] = useState<string[]>([]);
  const [prefTheme, setPrefTheme] = useState('dark');
  const [prefLocale, setPrefLocale] = useState('en');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [prefSavedMessage, setPrefSavedMessage] = useState(false);

  // Load sizing preferences on mount
  useEffect(() => {
    if (currentUser) {
      apiClient.get('/personalization/preferences')
        .then(res => {
          if (res.data) {
            const data = res.data;
            setPreferredSizes(data.preferredSizes ? data.preferredSizes.split(',').map((s: string) => s.trim()) : []);
            setPreferredFits(data.preferredFits ? data.preferredFits.split(',').map((f: string) => f.trim()) : []);
            setPrefTheme(data.theme || 'dark');
            setPrefLocale(data.locale || 'en');
            setNotificationsEnabled(data.notificationsEnabled !== false);
          }
        })
        .catch((err) => {
          console.warn('Failed to load user preferences', err);
        });
    }
  }, [currentUser]);

  if (currentUser && currentUser.email !== prevUserEmail) {
    setPrevUserEmail(currentUser.email);
    setName(currentUser.name);
  }

  // Redirect if logged out
  useEffect(() => {
    if (!currentUser) {
      router.push(`/${locale}/auth/login`);
    }
  }, [currentUser, router, locale]);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center space-y-md">
        <Loader2 className="text-4xl text-tertiary animate-spin" />
        <h3 className="font-headline-lg text-lg text-white">
          {t('profile.redirectingLogin')}
        </h3>
      </div>
    );
  }

  // Helper to build localized links
  const lLink = (path: string) => {
    if (path.startsWith('/en') || path.startsWith('/ar')) return path;
    const base = path === '/' ? '' : path;
    return `/${locale}${base}`;
  };

  // Filter orders by this user
  const userOrders = dbOrders.filter(
    order => order.userId === currentUser.id || order.customerEmail?.toLowerCase() === currentUser.email.toLowerCase()
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      try {
        await updateProfileMutation.mutateAsync({ name });
        setIsEditing(false);
        setSavedMessage(true);
        setTimeout(() => setSavedMessage(false), 3000);
      } catch (err) {
        // Handled by mutation toast
      }
    }
  };

  const handleLogoutClick = async () => {
    try {
      await logoutMutation.mutateAsync();
      router.push(`/${locale}`);
    } catch (e) {
      router.push(`/${locale}`);
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.patch('/personalization/preferences', {
        preferredSizes: preferredSizes.join(','),
        preferredFits: preferredFits.join(','),
        theme: prefTheme,
        locale: prefLocale,
        notificationsEnabled,
      });
      setPrefSavedMessage(true);
      setTimeout(() => setPrefSavedMessage(false), 3000);
    } catch (err) {
      console.error('Failed to save preferences', err);
    }
  };

  const toggleSize = (size: string) => {
    if (preferredSizes.includes(size)) {
      setPreferredSizes(preferredSizes.filter(s => s !== size));
    } else {
      setPreferredSizes([...preferredSizes, size]);
    }
  };

  const toggleFit = (fit: string) => {
    if (preferredFits.includes(fit)) {
      setPreferredFits(preferredFits.filter(f => f !== fit));
    } else {
      setPreferredFits([...preferredFits, fit]);
    }
  };

  return (
    <div className="bg-background text-on-background min-h-screen pb-xxl text-start">
      <main className="pt-8 px-6 md:px-margin-desktop max-w-container-max mx-auto space-y-xxl">
        
        {/* Header */}
        <div className="border-b border-outline-variant pb-lg flex flex-col sm:flex-row justify-between items-start sm:items-end gap-md">
          <div>
            <nav className="flex items-center gap-xs font-label-caps text-label-caps text-on-surface-variant/40 text-[10px] tracking-widest mb-md">
              <Link href={lLink('/')} className="hover:text-on-surface transition-colors">{t('nav.home')}</Link>
              <ChevronRight className="text-[12px] rtl:rotate-180" />
              <span className="text-tertiary">{t('profile.title')}</span>
            </nav>
            <h1 className="font-display-lg text-balance text-3xl md:text-5xl text-white uppercase tracking-tight font-black">
              {t('profile.title')}
            </h1>
            <p className="text-on-surface-variant text-sm leading-relaxed text-pretty mt-sm">
              {t('profile.subtitle')}
            </p>
          </div>
          <button 
            onClick={handleLogoutClick}
            className="px-6 py-3 border border-red-500/30 hover:bg-red-500 hover:text-white text-red-500 font-button text-xs uppercase rounded transition-all font-bold"
          >
            {t('profile.logOutAccount')}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl items-start">
          
          {/* 1. Account Details (Left: 4 cols) */}
          <div className="lg:col-span-4 space-y-lg">
            <div className="luxury-glass p-8 rounded-xl space-y-lg border border-outline-variant">
              <div className="flex items-center gap-md">
                <div className="w-16 h-16 rounded-full bg-tertiary text-black flex items-center justify-center font-display-lg text-2xl font-bold uppercase">
                  {currentUser.name.slice(0, 2)}
                </div>
                <div>
                  <h3 className="font-headline-lg text-lg text-white uppercase break-normal text-pretty font-bold">{currentUser.name}</h3>
                  <span className="font-label-caps text-[9px] text-tertiary bg-tertiary/10 border border-tertiary/20 px-2 py-0.5 rounded-full inline-block mt-0.5 font-bold">
                    {(currentUser.role || 'customer').toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Loyalty Tier Card */}
              {loyaltyAccount && (
                <Link
                  href={lLink('/loyalty')}
                  className="block luxury-glass p-5 rounded-xl border border-outline-variant hover:border-tertiary/30 transition-all group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Trophy className="h-4 w-4 text-tertiary" />
                    <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">{t('profile.loyaltyStatus')}</span>
                    <ChevronRight className="h-3 w-3 text-white/20 ml-auto group-hover:text-tertiary transition-colors" />
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xl font-bold text-white uppercase tracking-wide">{loyaltyAccount.tier}</p>
                      <p className="text-xs text-white/30 mt-0.5">{t('profile.pointsAvailable', { count: loyaltyAccount.points.toLocaleString() })}</p>
                    </div>
                    <Crown className="h-6 w-6 text-tertiary/40" />
                  </div>
                  {loyaltyAccount.nextTier && (
                    <div className="mt-3">
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-tertiary rounded-full"
                          style={{ width: `${loyaltyAccount.tierProgressPct}%` }}
                        />
                      </div>
                      <p className="text-[9px] text-white/20 font-mono mt-1">{t('profile.ptsTo', { count: loyaltyAccount.pointsNeeded, tier: loyaltyAccount.nextTier })}</p>
                    </div>
                  )}
                </Link>
              )}

              {savedMessage && (
                <div className="p-3 bg-tertiary/10 border border-tertiary/20 text-tertiary font-label-caps text-[10px] rounded text-center">
                  {t('profile.savedSuccess')}
                </div>
              )}

              {isEditing ? (
                <form onSubmit={handleSave} className="space-y-md">
                  <div className="space-y-xs">
                    <label className="font-label-caps text-[10px] text-on-surface-variant">NAME</label>
                    <input 
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full bg-background border border-outline-variant px-4 py-2.5 focus:border-tertiary focus:ring-0 text-white rounded text-sm font-sans"
                    />
                  </div>
                  <div className="space-y-xs">
                    <label className="font-label-caps text-[10px] text-on-surface-variant">EMAIL ADDRESS</label>
                    <input 
                      type="email"
                      value={currentUser.email}
                      disabled
                      className="w-full bg-background border border-outline-variant px-4 py-2.5 text-white/40 rounded text-sm font-sans cursor-not-allowed"
                    />
                  </div>
                  <div className="flex gap-sm">
                    <button 
                      type="submit"
                      className="flex-1 py-3 bg-tertiary text-black font-button text-xs uppercase rounded hover:brightness-105 transition-all font-bold"
                    >
                      {t('profile.save')}
                    </button>
                    <button 
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="flex-1 py-3 border border-outline-variant text-white font-button text-xs uppercase rounded hover:bg-white/5 transition-all font-bold"
                    >
                      {t('profile.cancel')}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-md border-t border-outline-variant pt-md">
                  <div className="space-y-xs text-sm font-sans normal-case">
                    <p className="text-on-surface-variant text-xs"><strong className="text-white">Email:</strong> {currentUser.email}</p>
                    <p className="text-on-surface-variant text-xs"><strong className="text-white">Status:</strong> {(currentUser.status || 'active').toUpperCase()}</p>
                    <p className="text-on-surface-variant text-xs"><strong className="text-white">Joined:</strong> {currentUser.joinedDate || (currentUser.createdAt ? new Date(currentUser.createdAt).toLocaleDateString() : 'N/A')}</p>
                  </div>
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="w-full py-3 bg-white text-black font-button text-xs uppercase rounded hover:bg-tertiary transition-colors font-bold"
                  >
                    {t('profile.editAccount')}
                  </button>
                </div>
              )}
            </div>

            {/* Sizing & Fit preferences card */}
            <div className="luxury-glass p-8 rounded-xl space-y-lg border border-outline-variant">
              <h3 className="font-headline-lg text-lg text-white uppercase border-b border-outline-variant pb-2 font-bold">
                {t('profile.sizePreferences')}
              </h3>
              
              {prefSavedMessage && (
                <div className="p-3 bg-tertiary/10 border border-tertiary/20 text-tertiary font-label-caps text-[10px] rounded text-center">
                  {t('profile.prefSavedSuccess')}
                </div>
              )}

              <form onSubmit={handleSavePreferences} className="space-y-md">
                <div className="space-y-xs">
                  <label className="font-label-caps text-[10px] text-on-surface-variant block">
                    {t('profile.preferredSizes')}
                  </label>
                  <div className="flex flex-wrap gap-sm pt-xs">
                    {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(size => {
                      const isSelected = preferredSizes.includes(size);
                      return (
                        <button
                          type="button"
                          key={size}
                          onClick={() => toggleSize(size)}
                          className={`px-3 py-1.5 rounded text-xs font-semibold border transition-all ${
                            isSelected 
                              ? 'bg-white text-black border-white' 
                              : 'bg-transparent text-white border-outline-variant hover:border-white/30'
                          }`}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-xs">
                  <label className="font-label-caps text-[10px] text-on-surface-variant block">
                    {t('profile.preferredFits')}
                  </label>
                  <div className="flex flex-wrap gap-sm pt-xs">
                    {['Slim', 'Regular', 'Loose', 'Compression', 'Oversized'].map(fit => {
                      const isSelected = preferredFits.includes(fit);
                      return (
                        <button
                          type="button"
                          key={fit}
                          onClick={() => toggleFit(fit)}
                          className={`px-3 py-1.5 rounded text-xs font-semibold border transition-all ${
                            isSelected 
                              ? 'bg-white text-black border-white' 
                              : 'bg-transparent text-white border-outline-variant hover:border-white/30'
                          }`}
                        >
                          {t(`profile.fit${fit}`)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-outline-variant pt-md">
                  <span className="font-label-caps text-[10px] text-on-surface-variant">
                    {t('profile.omnichannel')}
                  </span>
                  <Link 
                    href={lLink('/profile/notifications')}
                    className="text-[10px] font-mono tracking-widest uppercase text-tertiary hover:underline"
                  >
                    {t('profile.configure')} &rarr;
                  </Link>
                </div>

                <button 
                  type="submit"
                  className="w-full py-3 bg-tertiary text-black font-button text-xs uppercase rounded hover:brightness-105 transition-all mt-4 font-bold"
                >
                  {t('profile.saveStylePref')}
                </button>
              </form>
            </div>

            {/* AI computed Style DNA Profile */}
            <StyleDNACard />
          </div>

          {/* 2. Order History (Right: 8 cols) */}
          <div className="lg:col-span-8 space-y-lg">
            <div className="luxury-glass p-8 rounded-xl border border-outline-variant space-y-lg">
              <h2 className="font-headline-lg text-balance text-xl text-white uppercase border-b border-outline-variant pb-2 font-bold">
                {t('profile.orderHistory')} ({userOrders.length})
              </h2>

              {userOrders.length > 0 ? (
                <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-start border-collapse">
                    <thead>
                      <tr className="border-b border-outline-variant font-label-caps text-[10px] text-on-surface-variant/50">
                        <th className="py-3">{t('admin.orderId')}</th>
                        <th className="py-3">{t('admin.date')}</th>
                        <th className="py-3">{t('admin.total')}</th>
                        <th className="py-3">{t('admin.status')}</th>
                        <th className="py-3 text-end">{t('admin.action')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant font-sans normal-case text-sm text-on-surface-variant">
                      {userOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-4 text-white font-mono font-bold">{order.id}</td>
                          <td className="py-4 text-xs">{new Date(order.createdAt).toLocaleDateString()}</td>
                          <td className="py-4 text-white font-medium">{formatPrice(order.total, order.currency?.toUpperCase())}</td>
                          <td className="py-4">
                            <span className={`text-[9px] font-label-caps px-2 py-0.5 rounded-full inline-block ${
                              order.status === 'delivered' 
                                ? 'bg-green-500/10 border border-green-500/20 text-green-500'
                                : order.status === 'shipped' 
                                ? 'bg-blue-500/10 border border-blue-500/20 text-blue-500'
                                : 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-500'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="py-4 text-end">
                            <Link 
                              href={lLink(`/tracking/${order.id}`)}
                              className="font-label-caps text-[10px] text-tertiary hover:underline"
                            >
                              {t('profile.track')}
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-xl text-center space-y-sm text-on-surface-variant">
                  <Package className="text-4xl text-white/20" />
                  <p className="text-sm text-pretty leading-relaxed">
                    {t('profile.noOrders')}
                  </p>
                  <Link 
                    href={lLink('/shop')}
                    className="inline-block text-xs font-label-caps text-tertiary underline hover:text-white"
                  >
                    {t('profile.startShopping')}
                  </Link>
                </div>
              )}
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
