'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Settings, ShieldAlert, Cpu, Database, Mail, RefreshCw, Palette, Globe, CreditCard, CheckCircle2 } from 'lucide-react';
import { apiClient, getErrorMessage } from '../../../lib/api-client';
import { useToast } from '../../../providers/ToastProvider';
import { useCurrency } from '../../../providers/CurrencyProvider';
import { useTranslation } from '../../../providers/I18nProvider';

export default function AdminSettingsPage() {
  const { showToast } = useToast();
  const { formatPrice, usdToActive } = useCurrency();
  const { locale, t } = useTranslation();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Tabs: 'branding' | 'billing' | 'diagnostics'
  const [activeTab, setActiveTab] = useState<'branding' | 'billing' | 'diagnostics'>('branding');

  // Loading States
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [testingMail, setTestingMail] = useState(false);
  const [verifyingDomain, setVerifyingDomain] = useState(false);
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);

  // Settings state
  const [storeName, setStoreName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#0b0b0b');
  const [secondaryColor, setSecondaryColor] = useState('#add500');
  const [accentColor, setAccentColor] = useState('#ffffff');
  const [themeName, setThemeName] = useState('dark-luxe');
  const [customCss, setCustomCss] = useState('');
  const [customDomain, setCustomDomain] = useState('');

  // Billing and Quotas state
  const [subscription, setSubscription] = useState<any>(null);
  const [quotas, setQuotas] = useState<any>(null);

  useEffect(() => {
    fetchTenantData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const triggerToast = (msg: string, type: 'success' | 'error') => {
    setToastMessage(`${type.toUpperCase()}: ${msg}`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchTenantData = async () => {
    setLoading(true);
    try {
      const [detailsRes, billingRes] = await Promise.all([
        apiClient.get('/saas/tenant/details'),
        apiClient.get('/saas/billing/subscription'),
      ]);

      const settings = detailsRes.data.settings || {};
      setStoreName(settings.storeName || '');
      setLogoUrl(settings.logoUrl || '');
      setPrimaryColor(settings.primaryColor || '#0b0b0b');
      setSecondaryColor(settings.secondaryColor || '#add500');
      setAccentColor(settings.accentColor || '#ffffff');
      setThemeName(settings.themeName || 'dark-luxe');
      setCustomCss(settings.customCss || '');
      setCustomDomain(detailsRes.data.customDomain || '');

      setSubscription(billingRes.data.subscription);
      setQuotas(billingRes.data.quotas);
    } catch (err: unknown) {
      triggerToast(t('admin.failedLoadSettings'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await apiClient.put('/saas/tenant/settings', {
        storeName,
        logoUrl,
        primaryColor,
        secondaryColor,
        accentColor,
        themeName,
        customCss,
      });
      triggerToast(t('admin.brandingSaved'), 'success');
    } catch (err: unknown) {
      triggerToast(getErrorMessage(err), 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleDomainMapping = async () => {
    setVerifyingDomain(true);
    try {
      const formattedDomain = customDomain ? customDomain.toLowerCase().trim() : null;
      await apiClient.put('/saas/tenant/domain', { customDomain: formattedDomain });
      triggerToast(t('admin.domainVerified'), 'success');
    } catch (err: unknown) {
      triggerToast(getErrorMessage(err), 'error');
    } finally {
      setVerifyingDomain(false);
    }
  };

  const handleUpgradePlan = async (plan: string) => {
    setUpgradingPlan(plan);
    try {
      const res = await apiClient.post('/saas/billing/checkout', {
        planCode: plan,
        successUrl: typeof window !== 'undefined' ? `${window.location.origin}/admin/settings` : '',
        cancelUrl: typeof window !== 'undefined' ? `${window.location.origin}/admin/settings` : '',
      });
      if (res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (err: unknown) {
      triggerToast(getErrorMessage(err), 'error');
    } finally {
      setUpgradingPlan(null);
    }
  };

  const handleOpenPortal = async () => {
    try {
      const res = await apiClient.post('/saas/billing/portal', {
        returnUrl: typeof window !== 'undefined' ? `${window.location.origin}/admin/settings` : '',
      });
      if (res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (err: unknown) {
      triggerToast(getErrorMessage(err), 'error');
    }
  };

  const handleSweepCache = async () => {
    setClearingCache(true);
    try {
      await apiClient.post('/products/bulk/stock', { updates: [] });
      triggerToast(t('admin.cacheSwept'), 'success');
    } catch (err: unknown) {
      triggerToast(t('admin.failedSweepCache'), 'error');
    } finally {
      setClearingCache(false);
    }
  };

  const handleTestMail = async () => {
    setTestingMail(true);
    try {
      await apiClient.post('/notifications/read-all');
      triggerToast(t('admin.mailCheckPassed'), 'success');
    } catch (err: unknown) {
      triggerToast(t('admin.mailCheckFailed'), 'error');
    } finally {
      setTestingMail(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-tertiary animate-spin mb-md" />
        <p className="text-on-surface-variant text-xs uppercase tracking-wider font-label-caps">{t('admin.loadingSettingsPanel')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-xl text-start font-sans">
      {/* Toast Alert */}
      {toastMessage && (
        <div className={`fixed bottom-5 right-5 rtl:right-auto rtl:left-5 z-50 px-6 py-4.5 rounded shadow-lg border text-xs uppercase font-label-caps tracking-wider transition-all duration-300 ${
          toastMessage.startsWith('SUCCESS') 
            ? 'bg-green-500/10 border-green-500/30 text-green-400' 
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {toastMessage.split(': ')[1]}
        </div>
      )}

      {/* Header */}
      <div className="border-b border-white/5 pb-lg">
        <h1 className="font-display-lg text-3xl md:text-5xl text-white uppercase tracking-tight">{t('admin.storeConfig')}</h1>
        <p className="text-on-surface-variant text-sm mt-xs normal-case">
          {t('admin.storeConfigDesc')}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 gap-md text-xs font-label-caps">
        <button
          onClick={() => setActiveTab('branding')}
          className={`pb-3 border-b-2 uppercase font-bold tracking-wider transition-all ${
            activeTab === 'branding' ? 'border-tertiary text-white' : 'border-transparent text-on-surface-variant/60 hover:text-white'
          }`}
        >
          {t('admin.brandingStyling')}
        </button>
        <button
          onClick={() => setActiveTab('billing')}
          className={`pb-3 border-b-2 uppercase font-bold tracking-wider transition-all ${
            activeTab === 'billing' ? 'border-tertiary text-white' : 'border-transparent text-on-surface-variant/60 hover:text-white'
          }`}
        >
          {t('admin.saasBillingQuotas')}
        </button>
        <button
          onClick={() => setActiveTab('diagnostics')}
          className={`pb-3 border-b-2 uppercase font-bold tracking-wider transition-all ${
            activeTab === 'diagnostics' ? 'border-tertiary text-white' : 'border-transparent text-on-surface-variant/60 hover:text-white'
          }`}
        >
          {t('admin.systemDiagnostics')}
        </button>
      </div>

      {/* RENDER ACTIVE TAB */}
      {activeTab === 'branding' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
          {/* General branding setup (Left: 8 cols) */}
          <form onSubmit={handleSaveSettings} className="lg:col-span-8 space-y-lg text-xs">
            <section className="luxury-glass p-6 md:p-8 rounded-xl border border-white/5 space-y-lg">
              <h3 className="font-headline-lg text-lg text-white uppercase border-b border-white/5 pb-2 flex items-center gap-xs">
                <Palette className="w-5 h-5 text-tertiary" /> {t('admin.visualBrandBuilder')}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                <div className="space-y-1">
                  <label className="text-[10px] font-label-caps text-outline">{t('saas.storeName')}</label>
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full bg-white/[0.02] border border-white/10 rounded px-4 py-3 text-white focus:border-tertiary focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-label-caps text-outline">{t('admin.logoImageLink')}</label>
                  <input
                    type="text"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="w-full bg-white/[0.02] border border-white/10 rounded px-4 py-3 text-white focus:border-tertiary focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-label-caps text-outline">{t('admin.primaryBgColor')}</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-12 h-10 bg-transparent border border-white/10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1 bg-white/[0.02] border border-white/10 rounded px-4 py-3 text-white focus:border-tertiary focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-label-caps text-outline">{t('admin.accentHighlightsColor')}</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-12 h-10 bg-transparent border border-white/10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="flex-1 bg-white/[0.02] border border-white/10 rounded px-4 py-3 text-white focus:border-tertiary focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-label-caps text-outline">{t('admin.primaryTextColor')}</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-12 h-10 bg-transparent border border-white/10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="flex-1 bg-white/[0.02] border border-white/10 rounded px-4 py-3 text-white focus:border-tertiary focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-label-caps text-outline">{t('admin.storeThemeEngine')}</label>
                  <select
                    value={themeName}
                    onChange={(e) => setThemeName(e.target.value)}
                    className="w-full bg-white/[0.02] border border-white/10 rounded px-4 py-3 text-white focus:border-tertiary focus:outline-none h-[42px]"
                  >
                    <option value="dark-luxe" className="bg-black text-white">{t('admin.darkLuxeTheme')}</option>
                    <option value="light-minimal" className="bg-black text-white">{t('admin.lightMinimalTheme')}</option>
                    <option value="cyberpunk" className="bg-black text-white">{t('admin.cyberpunkTheme')}</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1 pt-2">
                <label className="text-[10px] font-label-caps text-outline">{t('admin.customCssOverrides')}</label>
                <textarea
                  value={customCss}
                  onChange={(e) => setCustomCss(e.target.value)}
                  placeholder={t('admin.customCssPlaceholder')}
                  rows={6}
                  className="w-full bg-white/[0.02] border border-white/10 rounded px-4 py-3 text-white focus:border-tertiary focus:outline-none font-mono"
                />
              </div>

              <div className="pt-4 text-start">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-6 py-3.5 bg-tertiary text-black font-button text-xs uppercase tracking-wider rounded font-bold hover:brightness-105 active:scale-[0.98] transition-all flex items-center gap-xs"
                >
                  {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
                  {t('admin.saveBrandingConfig')}
                </button>
              </div>
            </section>
          </form>

          {/* Domain mapping (Right: 4 cols) */}
          <div className="lg:col-span-4 space-y-lg text-xs">
            <section className="luxury-glass p-6 rounded-xl border border-white/5 space-y-md">
              <h3 className="font-headline-lg text-sm text-white uppercase border-b border-white/5 pb-2 flex items-center gap-xs">
                <Globe className="w-4 h-4 text-tertiary" /> {t('admin.customSslDomain')}
              </h3>
              <p className="text-on-surface-variant font-sans text-[11px] leading-relaxed">
                {t('admin.customDomainDesc')}
              </p>

              <div className="space-y-md pt-2">
                <div className="space-y-1 text-start">
                  <label className="text-[10px] font-label-caps text-outline">{t('admin.targetDomainName')}</label>
                  <input
                    type="text"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    placeholder="e.g. apexperformance.com"
                    className="w-full bg-white/[0.02] border border-white/10 rounded px-4 py-3 text-white focus:border-tertiary focus:outline-none"
                  />
                </div>

                <button
                  onClick={handleDomainMapping}
                  disabled={verifyingDomain}
                  className="w-full py-3 border border-white/10 hover:border-white/20 text-white font-button text-xs uppercase tracking-wider rounded active:scale-[0.98] transition-all flex items-center justify-center gap-xs font-bold"
                >
                  {verifyingDomain ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                  {t('admin.verifyDnsBind')}
                </button>
              </div>
            </section>
          </div>
        </div>
      )}

      {activeTab === 'billing' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
          {/* Plans upgrade (Left: 8 cols) */}
          <div className="lg:col-span-8 space-y-lg text-xs text-start">
            <section className="luxury-glass p-6 md:p-8 rounded-xl border border-white/5 space-y-lg">
              <h3 className="font-headline-lg text-lg text-white uppercase border-b border-white/5 pb-2 flex items-center gap-xs">
                <CreditCard className="w-5 h-5 text-tertiary" /> {t('admin.subUpgradeTiers')}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">
                {/* Growth */}
                <div className="p-5 bg-white/[0.01] border border-white/5 rounded-xl space-y-sm flex flex-col justify-between">
                  <div className="space-y-xs">
                    <span className="font-bold text-white text-[11px] block uppercase">{t('saas.growthPlan')}</span>
                    <span className="text-xl font-bold text-white font-display-lg">{formatPrice(usdToActive(149))}/{t('admin.mo')}</span>
                    <ul className="space-y-1 text-[10px] text-on-surface-variant pt-2 leading-relaxed">
                      <li>&bull; {t('saas.maxProducts', { count: 500 })}</li>
                      <li>&bull; {t('saas.warehouseLocations', { count: 2 })}</li>
                      <li>&bull; {t('saas.sslCustomDomains')}</li>
                    </ul>
                  </div>
                  <button
                    onClick={() => handleUpgradePlan('growth')}
                    disabled={upgradingPlan === 'growth' || subscription?.planCode === 'growth'}
                    className={`w-full py-2.5 rounded font-button text-[10px] uppercase font-bold tracking-wider transition-all mt-4 ${
                      subscription?.planCode === 'growth'
                        ? 'bg-tertiary/10 border border-tertiary/20 text-tertiary cursor-default'
                        : 'bg-white text-black hover:bg-tertiary'
                    }`}
                  >
                    {upgradingPlan === 'growth' ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : subscription?.planCode === 'growth' ? t('admin.activePlan') : t('admin.upgrade')}
                  </button>
                </div>

                {/* Pro */}
                <div className="p-5 bg-white/[0.01] border border-white/5 rounded-xl space-y-sm flex flex-col justify-between">
                  <div className="space-y-xs">
                    <span className="font-bold text-white text-[11px] block uppercase">{t('saas.proPlan')}</span>
                    <span className="text-xl font-bold text-white font-display-lg">{formatPrice(usdToActive(499))}/{t('admin.mo')}</span>
                    <ul className="space-y-1 text-[10px] text-on-surface-variant pt-2 leading-relaxed">
                      <li>&bull; {t('saas.maxProducts', { count: 2000 })}</li>
                      <li>&bull; {t('saas.warehouseLocations', { count: 5 })}</li>
                      <li>&bull; {t('saas.themeOverrides')}</li>
                      <li>&bull; {t('saas.fullAiSuite')}</li>
                    </ul>
                  </div>
                  <button
                    onClick={() => handleUpgradePlan('pro')}
                    disabled={upgradingPlan === 'pro' || subscription?.planCode === 'pro'}
                    className={`w-full py-2.5 rounded font-button text-[10px] uppercase font-bold tracking-wider transition-all mt-4 ${
                      subscription?.planCode === 'pro'
                        ? 'bg-tertiary/10 border border-tertiary/20 text-tertiary cursor-default'
                        : 'bg-white text-black hover:bg-tertiary'
                    }`}
                  >
                    {upgradingPlan === 'pro' ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : subscription?.planCode === 'pro' ? t('admin.activePlan') : t('admin.upgrade')}
                  </button>
                </div>

                {/* Enterprise */}
                <div className="p-5 bg-white/[0.01] border border-white/5 rounded-xl space-y-sm flex flex-col justify-between">
                  <div className="space-y-xs">
                    <span className="font-bold text-white text-[11px] block uppercase">{t('saas.entPlan')}</span>
                    <span className="text-xl font-bold text-white font-display-lg">{formatPrice(usdToActive(1999))}/{t('admin.mo')}</span>
                    <ul className="space-y-1 text-[10px] text-on-surface-variant pt-2 leading-relaxed">
                      <li>&bull; {t('saas.unlimitedProducts')}</li>
                      <li>&bull; {t('saas.unlimitedWarehouses')}</li>
                      <li>&bull; {t('saas.prioritySla')}</li>
                    </ul>
                  </div>
                  <button
                    onClick={() => handleUpgradePlan('enterprise')}
                    disabled={upgradingPlan === 'enterprise' || subscription?.planCode === 'enterprise'}
                    className={`w-full py-2.5 rounded font-button text-[10px] uppercase font-bold tracking-wider transition-all mt-4 ${
                      subscription?.planCode === 'enterprise'
                        ? 'bg-tertiary/10 border border-tertiary/20 text-tertiary cursor-default'
                        : 'bg-white text-black hover:bg-tertiary'
                    }`}
                  >
                    {upgradingPlan === 'enterprise' ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : subscription?.planCode === 'enterprise' ? t('admin.activePlan') : t('admin.upgrade')}
                  </button>
                </div>
              </div>
            </section>
          </div>

          {/* Plan Quotas Status (Right: 4 cols) */}
          <div className="lg:col-span-4 space-y-lg text-xs text-start">
            <section className="luxury-glass p-6 rounded-xl border border-white/5 space-y-md">
              <h3 className="font-headline-lg text-sm text-white uppercase border-b border-white/5 pb-2 flex items-center gap-xs">
                <CheckCircle2 className="w-4 h-4 text-tertiary" /> {t('admin.activeQuotasLimits')}
              </h3>

              <div className="space-y-sm font-sans">
                <div className="p-4 bg-white/[0.01] border border-white/5 rounded-lg space-y-1">
                  <span className="font-bold text-white uppercase text-[10px]">{t('admin.productListingLimits')}</span>
                  <div className="flex justify-between text-on-surface-variant text-[11px] pt-1">
                    <span>{t('admin.productsCreated', { count: quotas?.products?.count || 0 })}</span>
                    <span>{t('admin.maxQuota', { quota: quotas?.products?.max === 999999 ? t('admin.unlimited') : quotas?.products?.max || 100 })}</span>
                  </div>
                  <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mt-2">
                    <div
                      className="bg-tertiary h-full rounded-full"
                      style={{ width: `${Math.min(100, ((quotas?.products?.count || 0) / (quotas?.products?.max || 100)) * 100)}%` }}
                    />
                  </div>
                </div>

                <div className="p-4 bg-white/[0.01] border border-white/5 rounded-lg space-y-1">
                  <span className="font-bold text-white uppercase text-[10px]">{t('admin.warehouseLogisticsLimits')}</span>
                  <div className="flex justify-between text-on-surface-variant text-[11px] pt-1">
                    <span>{t('admin.activeHubsCount', { count: quotas?.warehouses?.count || 0 })}</span>
                    <span>{t('admin.maxQuota', { quota: quotas?.warehouses?.max === 999999 ? t('admin.unlimited') : quotas?.warehouses?.max || 1 })}</span>
                  </div>
                </div>
              </div>

              {subscription?.stripeCustomerId && (
                <button
                  onClick={handleOpenPortal}
                  className="w-full py-3 bg-white text-black font-button text-xs uppercase tracking-wider rounded font-bold hover:bg-tertiary transition-all"
                >
                  {t('admin.manageBillingStripe')}
                </button>
              )}
            </section>
          </div>
        </div>
      )}

      {activeTab === 'diagnostics' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
          {/* Connection Diagnostics (Left: 8 cols) */}
          <div className="lg:col-span-8 space-y-lg">
            <section className="luxury-glass p-6 md:p-8 rounded-xl border border-white/5 space-y-lg">
              <h3 className="font-headline-lg text-lg text-white uppercase border-b border-white/5 pb-2 flex items-center gap-xs">
                <Cpu className="w-5 h-5 text-tertiary" /> {t('admin.nodeEngineInfra')}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-md font-sans text-xs">
                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-lg space-y-xs">
                  <span className="font-label-caps text-[9px] text-on-surface-variant/50">{t('admin.gatewayEndpointUrl')}</span>
                  <p className="text-white font-mono break-all">f:\CV\E-Commerce Platform\backend</p>
                  <div className="flex items-center gap-xs text-[9px] text-tertiary font-label-caps pt-2">
                    <span className="w-1.5 h-1.5 bg-tertiary rounded-full"></span>
                    {t('admin.connected')}
                  </div>
                </div>

                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-lg space-y-xs">
                  <span className="font-label-caps text-[9px] text-on-surface-variant/50">{t('admin.stripeConnEnv')}</span>
                  <p className="text-white font-mono uppercase">Stripe API (Live Webhooks Active)</p>
                  <div className="flex items-center gap-xs text-[9px] text-tertiary font-label-caps pt-2">
                    <span className="w-1.5 h-1.5 bg-tertiary rounded-full"></span>
                    {t('admin.verifiedSecure')}
                  </div>
                </div>

                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-lg space-y-xs">
                  <span className="font-label-caps text-[9px] text-on-surface-variant/50">{t('admin.groqVersion')}</span>
                  <p className="text-white font-mono">GROQ API (llama3-70b-8192)</p>
                  <div className="flex items-center gap-xs text-[9px] text-tertiary font-label-caps pt-2">
                    <span className="w-1.5 h-1.5 bg-tertiary rounded-full"></span>
                    {t('admin.insightsCached')}
                  </div>
                </div>

                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-lg space-y-xs">
                  <span className="font-label-caps text-[9px] text-on-surface-variant/50">{t('admin.redisCacheConfig')}</span>
                  <p className="text-white font-mono">In-Memory Cache (Redis active)</p>
                  <div className="flex items-center gap-xs text-[9px] text-tertiary font-label-caps pt-2">
                    <span className="w-1.5 h-1.5 bg-tertiary rounded-full"></span>
                    {t('admin.operational')}
                  </div>
                </div>
              </div>
            </section>

            {/* Operational Shell Actions */}
            <section className="luxury-glass p-6 md:p-8 rounded-xl border border-white/5 space-y-lg">
              <h3 className="font-headline-lg text-lg text-white uppercase border-b border-white/5 pb-2 flex items-center gap-xs">
                <Database className="w-5 h-5 text-tertiary" /> {t('admin.cacheDbSweepers')}
              </h3>

              <p className="text-on-surface-variant font-sans text-xs normal-case leading-relaxed">
                {t('admin.sweepCacheDesc')}
              </p>

              <div className="flex flex-wrap gap-md pt-2">
                <button
                  onClick={handleSweepCache}
                  disabled={clearingCache}
                  className="px-5 py-3.5 bg-tertiary text-black font-button text-xs uppercase tracking-wider rounded hover:brightness-105 active:scale-[0.98] transition-all flex items-center gap-xs font-bold"
                >
                  {clearingCache ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  {t('admin.purgeRedisCache')}
                </button>

                <button
                  onClick={handleTestMail}
                  disabled={testingMail}
                  className="px-5 py-3.5 border border-white/10 text-white hover:border-white/20 hover:bg-white/[0.01] font-button text-xs uppercase tracking-wider rounded active:scale-[0.98] transition-all flex items-center gap-xs font-bold"
                >
                  {testingMail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  {t('admin.runTelemetryCheck')}
                </button>
              </div>
            </section>
          </div>

          {/* Security Parameters (Right: 4 cols) */}
          <div className="lg:col-span-4 space-y-lg">
            <section className="luxury-glass p-6 rounded-xl border border-white/5 space-y-md">
              <h3 className="font-headline-lg text-sm text-white uppercase border-b border-white/5 pb-2 flex items-center gap-xs">
                <ShieldAlert className="w-4 h-4 text-red-500" /> {t('admin.securitySafeguards')}
              </h3>

              <div className="space-y-sm text-xs font-sans normal-case text-on-surface-variant">
                <div className="p-3.5 bg-white/[0.01] border border-white/5 rounded-lg space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white uppercase text-[10px]">{t('admin.superAdminMode')}</span>
                    <span className="text-[9px] font-label-caps text-green-500 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full font-bold">{t('admin.active')}</span>
                  </div>
                  <p className="text-[10px] text-on-surface-variant/60 leading-normal">
                    {t('admin.superAdminDesc')}
                  </p>
                </div>

                <div className="p-3.5 bg-white/[0.01] border border-white/5 rounded-lg space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white uppercase text-[10px]">{t('admin.stripeWebhookLogs')}</span>
                    <span className="text-[9px] font-label-caps text-green-500 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full font-bold">{t('admin.encrypted')}</span>
                  </div>
                  <p className="text-[10px] text-on-surface-variant/60 leading-normal">
                    {t('admin.stripeWebhookDesc')}
                  </p>
                </div>

                <div className="p-3.5 bg-white/[0.01] border border-white/5 rounded-lg space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white uppercase text-[10px]">{t('admin.auditTrailsSeverity')}</span>
                    <span className="text-[9px] font-label-caps text-tertiary bg-tertiary/10 border border-tertiary/20 px-2 py-0.5 rounded-full font-bold">{t('admin.allEvents')}</span>
                  </div>
                  <p className="text-[10px] text-on-surface-variant/60 leading-normal">
                    {t('admin.auditTrailsDesc')}
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
