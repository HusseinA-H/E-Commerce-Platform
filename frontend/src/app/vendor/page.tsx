'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Loader2, 
  Store, 
  ArrowRight, 
  AlertTriangle, 
  CheckCircle, 
  DollarSign, 
  ShoppingBag, 
  Percent, 
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { apiClient, getErrorMessage } from '../../lib/api-client';
import { useAuthStore } from '../../store';
import { useTranslation } from '../../providers/I18nProvider';
import { useCurrency } from '../../providers/CurrencyProvider';

export default function VendorDashboard() {
  const router = useRouter();
  const { locale, t } = useTranslation();
  const { formatPrice } = useCurrency();
  const { currentUser } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [vendorData, setVendorData] = useState<any>(null);
  const [registering, setRegistering] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [onboardingUrlLoading, setOnboardingUrlLoading] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await apiClient.get('/vendor/dashboard');
      setVendorData(res.data);
    } catch (e: any) {
      const msg = getErrorMessage(e);
      if (e.response?.status === 404) {
        // User is not a vendor yet -> keep vendorData null to trigger registration onboarding
        setVendorData(null);
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchDashboardData();
    }
  }, [currentUser]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim()) return;

    setRegistering(true);
    setErrorMessage('');
    try {
      const res = await apiClient.post('/vendor/register', { storeName });
      // Update auth store user details or fetch dashboard data
      await fetchDashboardData();
    } catch (err: any) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setRegistering(false);
    }
  };

  const handleOnboard = async () => {
    setOnboardingUrlLoading(true);
    setErrorMessage('');
    try {
      const refreshUrl = window.location.href;
      const returnUrl = window.location.href;
      const res = await apiClient.post('/vendor/onboard', { refreshUrl, returnUrl });
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (err: any) {
      setErrorMessage(getErrorMessage(err));
      setOnboardingUrlLoading(false);
    }
  };

  const checkOnboardStatus = async () => {
    setLoading(true);
    try {
      await apiClient.get('/vendor/status');
      await fetchDashboardData();
    } catch (e: any) {
      setErrorMessage(getErrorMessage(e));
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-md">
        <Loader2 className="h-8 w-8 text-tertiary animate-spin" />
        <span className="text-sm text-on-surface-variant font-semibold">
          {t('vendor.loading')}
        </span>
      </div>
    );
  }

  // 1. Registration state (Not a vendor yet)
  if (!vendorData && !errorMessage) {
    return (
      <div className="max-w-xl mx-auto py-12 text-start">
        <div className="luxury-glass p-8 rounded-2xl border border-outline-variant space-y-lg">
          <div className="w-12 h-12 rounded-xl bg-tertiary/10 border border-tertiary/20 flex items-center justify-center">
            <Store className="h-6 w-6 text-tertiary" />
          </div>
          <div>
            <h1 className="font-display-lg text-2xl text-white uppercase font-black">
              {t('vendor.registerTitle')}
            </h1>
            <p className="text-on-surface-variant text-sm mt-sm leading-relaxed">
              {t('vendor.registerDesc')}
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-md">
            <div className="space-y-xs">
              <label className="font-label-caps text-[10px] text-on-surface-variant block uppercase">
                {t('vendor.storeName')}
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                required
                className="w-full bg-background border border-outline-variant px-4 py-3 rounded text-sm text-white focus:border-tertiary outline-none transition-colors"
                placeholder="e.g. APEX ATELIER"
              />
            </div>
            <button
              type="submit"
              disabled={registering}
              className="w-full bg-white text-black hover:bg-tertiary px-6 py-3.5 font-button text-xs uppercase rounded font-bold transition-all flex items-center justify-center gap-md"
            >
              {registering ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {t('vendor.registerButton')}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. Unverified state (Registered but Stripe Connect onboarding incomplete)
  if (vendorData && !vendorData.isVerified) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-start">
        <div className="luxury-glass p-8 rounded-2xl border border-outline-variant space-y-lg relative overflow-hidden">
          <div className="absolute top-0 end-0 w-32 h-32 bg-tertiary/5 rounded-full blur-3xl" />
          
          <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-yellow-500" />
          </div>

          <div>
            <h1 className="font-display-lg text-2xl text-white uppercase font-black">
              {t('vendor.setupStripe')}
            </h1>
            <p className="text-on-surface-variant text-sm mt-xs leading-relaxed">
              {t('vendor.setupStripeDesc').replace('{name}', vendorData.storeName)}
            </p>
          </div>

          <div className="bg-black/30 border border-outline-variant rounded-xl p-4 space-y-sm text-xs font-sans text-on-surface-variant">
            <div className="flex items-center gap-sm">
              <CheckCircle className="h-4 w-4 text-tertiary shrink-0" />
              <span>{t('vendor.stripeBenefits.listings')}</span>
            </div>
            <div className="flex items-center gap-sm">
              <CheckCircle className="h-4 w-4 text-tertiary shrink-0" />
              <span>{t('vendor.stripeBenefits.payouts')}</span>
            </div>
            <div className="flex items-center gap-sm">
              <CheckCircle className="h-4 w-4 text-tertiary shrink-0" />
              <span>{t('vendor.stripeBenefits.commission')}</span>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded">
              {errorMessage}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-md pt-md">
            <button
              onClick={handleOnboard}
              disabled={onboardingUrlLoading}
              className="flex-1 bg-tertiary text-on-tertiary hover:opacity-90 px-6 py-3.5 font-button text-xs uppercase rounded font-bold transition-all flex items-center justify-center gap-xs"
            >
              {onboardingUrlLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t('vendor.connectStripe')
              )}
            </button>
            <button
              onClick={checkOnboardStatus}
              className="px-6 py-3.5 border border-outline-variant hover:bg-white/5 text-white font-button text-xs uppercase rounded font-bold transition-all flex items-center justify-center gap-xs"
            >
              <RefreshCw className="h-4 w-4" />
              {t('vendor.verifyOnboarding')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Active Dashboard
  const metrics = vendorData.metrics;

  return (
    <div className="space-y-xl text-start">
      {/* Page Title */}
      <div className="flex justify-between items-center border-b border-outline-variant pb-md">
        <div>
          <h1 className="font-display-lg text-3xl text-white uppercase font-black">
            {vendorData.storeName}
          </h1>
          <p className="text-on-surface-variant text-xs mt-xs">
            {t('vendor.sellerStatus')}
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="p-2 border border-outline-variant rounded hover:bg-white/5 transition-all text-on-surface-variant hover:text-white"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
        {/* Gross Revenue */}
        <div className="luxury-glass p-6 rounded-xl border border-outline-variant space-y-sm">
          <div className="flex justify-between items-center">
            <span className="font-label-caps text-[10px] text-on-surface-variant">{t('vendor.grossRevenue')}</span>
            <DollarSign className="h-4 w-4 text-tertiary" />
          </div>
          <p className="text-3xl font-black text-white">{formatPrice(metrics.grossRevenue)}</p>
        </div>

        {/* Payouts Net Earnings */}
        <div className="luxury-glass p-6 rounded-xl border border-outline-variant space-y-sm">
          <div className="flex justify-between items-center">
            <span className="font-label-caps text-[10px] text-on-surface-variant">{t('vendor.netEarnings')}</span>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-black text-white">{formatPrice(metrics.netEarnings)}</p>
        </div>

        {/* Total Orders */}
        <div className="luxury-glass p-6 rounded-xl border border-outline-variant space-y-sm">
          <div className="flex justify-between items-center">
            <span className="font-label-caps text-[10px] text-on-surface-variant">{t('vendor.totalOrders')}</span>
            <ShoppingBag className="h-4 w-4 text-blue-400" />
          </div>
          <p className="text-3xl font-black text-white">{metrics.totalOrders}</p>
        </div>

        {/* Platform commission */}
        <div className="luxury-glass p-6 rounded-xl border border-outline-variant space-y-sm">
          <div className="flex justify-between items-center">
            <span className="font-label-caps text-[10px] text-on-surface-variant">{t('vendor.commissionPaid')}</span>
            <Percent className="h-4 w-4 text-purple-400" />
          </div>
          <p className="text-3xl font-black text-white">{formatPrice(metrics.commissionPaid)}</p>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-xl items-start">
        
        {/* Left/Middle: Payout Summary & Catalog stats */}
        <div className="lg:col-span-2 space-y-md">
          {/* Payout Schedule Summary */}
          <div className="luxury-glass p-8 rounded-xl border border-outline-variant space-y-md">
            <h3 className="font-headline-lg text-lg text-white uppercase border-b border-outline-variant pb-2 font-bold">
              {t('vendor.payoutTracking')}
            </h3>
            <div className="grid grid-cols-2 gap-md py-xs">
              <div className="space-y-xs">
                <span className="text-[10px] text-on-surface-variant block uppercase">{t('vendor.totalTransferredLabel')}</span>
                <span className="text-xl font-bold text-white">{formatPrice(metrics.totalPaid)}</span>
              </div>
              <div className="space-y-xs">
                <span className="text-[10px] text-on-surface-variant block uppercase">{t('vendor.pendingLedgerLabel')}</span>
                <span className="text-xl font-bold text-tertiary">{formatPrice(metrics.pendingPayout)}</span>
              </div>
            </div>
            <div className="pt-xs">
              <button
                onClick={() => router.push(`/${locale}/vendor/payouts`)}
                className="font-button text-button text-xs border-b border-white hover:border-tertiary hover:text-tertiary transition-colors uppercase w-fit pb-1 font-bold"
              >
                {t('vendor.viewHistory')}
              </button>
            </div>
          </div>

          {/* Quick stock warning */}
          {metrics.lowStockCount > 0 && (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded-xl flex items-center gap-md">
              <AlertTriangle className="h-6 w-6 shrink-0 text-yellow-500" />
              <div className="text-xs font-semibold">
                {t('vendor.inventoryWarning').replace('{count}', metrics.lowStockCount.toString())}
              </div>
            </div>
          )}
        </div>

        {/* Right: Groq AI Marketplace Insights */}
        <div className="space-y-md">
          <div className="luxury-glass p-8 rounded-xl border border-outline-variant space-y-md relative overflow-hidden">
            <div className="absolute top-0 end-0 w-32 h-32 bg-tertiary/10 rounded-full blur-3xl pointer-events-none" />
            <h3 className="font-headline-lg text-lg text-white uppercase border-b border-outline-variant pb-2 flex items-center gap-2 font-bold">
              <Sparkles className="h-5 w-5 text-tertiary" />
              {t('vendor.aiIntelligence')}
            </h3>
            <ul className="space-y-md text-xs font-sans leading-relaxed text-on-surface-variant">
              {vendorData.aiInsights?.map((insight: string, idx: number) => (
                <li key={idx} className="flex items-start gap-md border-b border-white/5 pb-md last:border-b-0 last:pb-0">
                  <span className="w-5 h-5 rounded-full bg-tertiary text-black flex items-center justify-center text-[10px] font-black shrink-0">
                    {idx + 1}
                  </span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}
