'use client';

import React, { useState, useEffect } from 'react';
import { useProductsQuery } from '../../../hooks/useProducts';
import {
  Loader2,
  Sparkles,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Users,
  ShieldAlert,
  Send,
  RefreshCw,
  Percent,
  Calendar,
  CheckCircle,
  FileText,
  Mail,
  ChevronRight,
} from 'lucide-react';
import { apiClient } from '../../../lib/api-client';
import { useToast } from '../../../providers/ToastProvider';
import { useTranslation } from '../../../providers/I18nProvider';

export default function AdminGlobalIntelligencePage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { data: products = [] } = useProductsQuery();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'pricing' | 'forecasting' | 'customers' | 'campaign'>('overview');

  // API Data States
  const [execData, setExecData] = useState<any>(null);
  const [pricingData, setPricingData] = useState<any[]>([]);
  const [forecastsData, setForecastsData] = useState<any>({ demandForecasts: [], categoryForecasts: [], regionalForecasts: [], inventoryForecasts: [] });
  const [customerData, setCustomerData] = useState<any[]>([]);
  const [fraudData, setFraudData] = useState<any[]>([]);

  // Loading States
  const [loadingExec, setLoadingExec] = useState(true);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [loadingForecasts, setLoadingForecasts] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [recomputing, setRecomputing] = useState(false);

  // Campaign Form States
  const [campaignName, setCampaignName] = useState('Summer Peak Performance Drop');
  const [targetAudience, setTargetAudience] = useState('VIP Customers');
  const [selectedProductNames, setSelectedProductNames] = useState<string[]>([]);
  const [incentive, setIncentive] = useState('15% off dynamic markdown with code PEAK15');
  const [campaignOutput, setCampaignOutput] = useState<any>(null);
  const [generatingCampaign, setGeneratingCampaign] = useState(false);

  // Load Executive Summary
  const fetchExecutiveDashboard = async () => {
    setLoadingExec(true);
    try {
      const res = await apiClient.get('/ai-intelligence/executive');
      setExecData(res.data);
    } catch (err) {
      console.error('Failed to load executive reports', err);
      showToast(t('adminGlobalIntel.failedLoadExecutive'), 'error');
    } finally {
      setLoadingExec(false);
    }
  };

  // Load Pricing Advice
  const fetchPricingAdvice = async () => {
    setLoadingPricing(true);
    try {
      const res = await apiClient.get('/ai-intelligence/pricing');
      setPricingData(res.data.pricingAdvice || []);
    } catch (err) {
      console.error('Failed to load pricing data', err);
    } finally {
      setLoadingPricing(false);
    }
  };

  // Load Forecasts
  const fetchForecasts = async () => {
    setLoadingForecasts(true);
    try {
      const res = await apiClient.get('/ai-intelligence/forecasting');
      setForecastsData(res.data);
    } catch (err) {
      console.error('Failed to load forecasting metrics', err);
    } finally {
      setLoadingForecasts(false);
    }
  };

  // Load Customers (RFM Segmentation) & Fraud Logs
  const fetchCustomersAndFraud = async () => {
    setLoadingCustomers(true);
    try {
      const [segRes, fraudRes] = await Promise.all([
        apiClient.get('/ai-intelligence/segmentation'),
        apiClient.get('/ai-intelligence/fraud'),
      ]);
      setCustomerData(segRes.data.customerSegments || []);
      setFraudData(fraudRes.data.fraudLog || []);
    } catch (err) {
      console.error('Failed to load customer profiles', err);
    } finally {
      setLoadingCustomers(false);
    }
  };

  // Trigger Asynchronous recalculation
  const handleRecompute = async () => {
    setRecomputing(true);
    try {
      await apiClient.post('/ai-intelligence/refresh');
      showToast(t('adminGlobalIntel.recomputePipeline'), 'success');
      setTimeout(() => {
        fetchExecutiveDashboard();
        setRecomputing(false);
      }, 5000); // 5s buffer before checking updates
    } catch (err) {
      showToast(t('adminGlobalIntel.recomputeFailed'), 'error');
      setRecomputing(false);
    }
  };

  // Submit Campaign Generator
  const handleGenerateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProductNames.length === 0) {
      showToast(t('adminGlobalIntel.selectOneProduct'), 'error');
      return;
    }
    setGeneratingCampaign(true);
    try {
      const res = await apiClient.post('/ai-intelligence/campaign', {
        campaignName,
        targetAudience,
        promotedProducts: selectedProductNames,
        incentiveDescription: incentive,
      });
      setCampaignOutput(res.data);
      showToast(t('adminGlobalIntel.campaignGenerated'), 'success');
    } catch (err) {
      showToast(t('adminGlobalIntel.campaignFailed'), 'error');
    } finally {
      setGeneratingCampaign(false);
    }
  };

  useEffect(() => {
    fetchExecutiveDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch tab-specific data on change
  useEffect(() => {
    if (activeTab === 'pricing') fetchPricingAdvice();
    else if (activeTab === 'forecasting') fetchForecasts();
    else if (activeTab === 'customers') fetchCustomersAndFraud();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  return (
    <div className="space-y-xl text-start">
      {/* Header */}
      <div className="border-b border-white/5 pb-lg flex flex-col xl:flex-row xl:justify-between xl:items-end gap-md">
        <div>
          <h1 className="font-display-lg text-3xl md:text-5xl text-white uppercase tracking-tight flex items-center gap-sm">
            {t('adminGlobalIntel.title')}
            <span className="text-[10px] font-mono font-normal bg-tertiary/10 text-tertiary border border-tertiary/30 px-2 py-1 rounded">
              Llama 3.3 Active
            </span>
          </h1>
          <p className="text-on-surface-variant text-sm font-sans normal-case mt-sm">
            {t('adminGlobalIntel.desc')}
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-xs">
          {[
            { id: 'overview', label: t('adminGlobalIntel.tabs.overview'), icon: Sparkles },
            { id: 'pricing', label: t('adminGlobalIntel.tabs.pricing'), icon: DollarSign },
            { id: 'forecasting', label: t('adminGlobalIntel.tabs.forecasting'), icon: TrendingUp },
            { id: 'customers', label: t('adminGlobalIntel.tabs.customers'), icon: Users },
            { id: 'campaign', label: t('adminGlobalIntel.tabs.campaign'), icon: Mail },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2.5 text-[10px] font-label-caps border rounded-lg transition-all flex items-center gap-sm ${
                  isActive
                    ? 'bg-tertiary text-black border-tertiary font-bold'
                    : 'text-on-surface-variant border-white/5 hover:border-white/10 hover:text-white bg-white/[0.01]'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: Executive Dashboard */}
      {activeTab === 'overview' && (
        <div className="space-y-lg text-start">
          {loadingExec ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-md">
              <Loader2 className="w-8 h-8 border-2 border-white/10 border-t-tertiary rounded-full animate-spin text-tertiary" />
              <p className="text-on-surface-variant font-label-caps text-xs">{t('adminGlobalIntel.loadingFinancial')}</p>
            </div>
          ) : (
            <>
              {/* Dashboard Key Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-lg text-start">
                
                {/* 90-Day Revenue */}
                <div className="luxury-glass p-6 rounded-xl border border-white/5 flex flex-col justify-between space-y-sm">
                  <span className="font-label-caps text-[9px] text-on-surface-variant/60">{t('adminGlobalIntel.kpis.revenue90Days')}</span>
                  <div className="flex items-end justify-between">
                    <h2 className="text-white text-2xl font-display-lg">${execData?.revenue90Days?.toLocaleString() || '0'}</h2>
                    <span className="text-[10px] font-mono text-white/40">USD</span>
                  </div>
                </div>

                {/* 30-Day Revenue Forecast */}
                <div className="luxury-glass p-6 rounded-xl border border-white/5 flex flex-col justify-between space-y-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 rtl:left-0 rtl:right-auto w-24 h-24 bg-tertiary/5 rounded-full blur-2xl group-hover:bg-tertiary/10 transition-all"></div>
                  <span className="font-label-caps text-[9px] text-tertiary">{t('adminGlobalIntel.kpis.revenueForecast')}</span>
                  <div className="flex items-end justify-between">
                    <h2 className="text-white text-2xl font-display-lg">${execData?.forecastedRevenueNext30Days?.toLocaleString() || '0'}</h2>
                    <span className="text-[10px] font-mono text-tertiary font-bold">+{execData?.forecastedGrowthPercent}%</span>
                  </div>
                </div>

                {/* Churn Risk */}
                <div className="luxury-glass p-6 rounded-xl border border-white/5 flex flex-col justify-between space-y-sm">
                  <span className="font-label-caps text-[9px] text-on-surface-variant/60">{t('adminGlobalIntel.kpis.churnRisk')}</span>
                  <div className="flex items-end justify-between">
                    <h2 className="text-yellow-400 text-2xl font-display-lg">{execData?.churnRiskCount || '0'} users</h2>
                    <span className="text-[10px] font-mono text-yellow-500/60">At-Risk</span>
                  </div>
                </div>

                {/* Critical restocks */}
                <div className="luxury-glass p-6 rounded-xl border border-white/5 flex flex-col justify-between space-y-sm">
                  <span className="font-label-caps text-[9px] text-on-surface-variant/60">{t('adminGlobalIntel.kpis.criticalRestocks')}</span>
                  <div className="flex items-end justify-between">
                    <h2 className={`text-2xl font-display-lg ${execData?.criticalRestockCount > 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {execData?.criticalRestockCount || '0'} items
                    </h2>
                    <span className="text-[10px] font-mono text-red-500/60">Restocks</span>
                  </div>
                </div>

              </div>

              {/* Strategic Insights & Growth Opportunities */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg text-start">
                
                {/* Advisor Advice */}
                <section className="lg:col-span-2 luxury-glass p-6 md:p-8 rounded-xl border border-white/5 space-y-md">
                  <div className="flex items-center gap-xs border-b border-white/5 pb-sm">
                    <Sparkles className="h-5 w-5 text-tertiary" />
                    <h3 className="font-label-caps text-xs text-white">{t('adminGlobalIntel.strategicTitle')}</h3>
                  </div>
                  <p className="text-white/90 leading-relaxed font-sans normal-case text-sm">
                    {execData?.strategicBusinessAdvice}
                  </p>
                  <div className="pt-md">
                    <button
                      onClick={handleRecompute}
                      disabled={recomputing}
                      className="px-5 py-3 border border-tertiary text-tertiary hover:bg-tertiary hover:text-black font-button text-[10px] uppercase rounded-lg transition-all flex items-center gap-sm disabled:opacity-50"
                    >
                      {recomputing ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <RefreshCw className="w-4.5 h-4.5" />}
                      {t('adminGlobalIntel.recomputeButton')}
                    </button>
                  </div>
                </section>

                {/* Growth Opportunities */}
                <section className="luxury-glass p-6 md:p-8 rounded-xl border border-white/5 space-y-md">
                  <h3 className="font-label-caps text-xs text-white border-b border-white/5 pb-sm">{t('adminGlobalIntel.opportunityTitle')}</h3>
                  <div className="space-y-md">
                    {execData?.growthOpportunities?.map((opp: string, idx: number) => (
                      <div key={idx} className="flex gap-sm items-start text-start">
                        <span className="w-5 h-5 rounded-full bg-tertiary/10 text-tertiary flex items-center justify-center font-bold font-mono text-xs shrink-0 mt-0.5">
                          0{idx + 1}
                        </span>
                        <p className="text-xs text-on-surface-variant font-sans normal-case leading-relaxed text-pretty">
                          {opp}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>

              </div>
            </>
          )}
        </div>
      )}

      {/* Tab 2: Pricing Optimizer */}
      {activeTab === 'pricing' && (
        <div className="space-y-lg text-start">
          {loadingPricing ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 border-2 border-white/10 border-t-tertiary rounded-full animate-spin text-tertiary mb-sm" />
              <p className="text-on-surface-variant font-label-caps text-xs">MODELING SALES VOLUMES & MARGINS</p>
            </div>
          ) : (
            <section className="luxury-glass p-6 md:p-8 rounded-xl border border-white/5 text-start">
              <h3 className="font-label-caps text-xs text-white border-b border-white/5 pb-sm mb-md">{t('adminGlobalIntel.pricingTitle')}</h3>
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-start text-xs border-collapse">
                  <thead>
                    <tr className="text-outline font-label-caps text-[9px] border-b border-white/5 pb-3">
                      <th className="py-2.5 text-start">{t('adminGlobalIntel.table.productName')}</th>
                      <th className="py-2.5 text-start">{t('adminGlobalIntel.table.physicalInventory')}</th>
                      <th className="py-2.5 text-start">{t('adminGlobalIntel.table.velocity30')}</th>
                      <th className="py-2.5 text-center">{t('adminGlobalIntel.table.currentPrice')}</th>
                      <th className="py-2.5 text-center">{t('adminGlobalIntel.table.aiPrice')}</th>
                      <th className="py-2.5 text-center">{t('adminGlobalIntel.table.suggestedDiscount')}</th>
                      <th className="py-2.5 text-end pr-3">{t('adminGlobalIntel.table.rationale')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-sans normal-case text-on-surface-variant">
                    {pricingData.map((item) => {
                      const priceChanged = item.recommendedPrice !== item.currentPrice;
                      return (
                        <tr key={item.productId} className="hover:bg-white/[0.01]">
                          <td className="py-3 font-bold text-white uppercase text-xs text-start">{item.productName}</td>
                          <td className="py-3 font-mono text-start">{item.inventoryLevel} {t('adminGlobal.units')}</td>
                          <td className="py-3 font-mono font-bold text-white text-start">{item.velocity30Days} sold</td>
                          <td className="py-3 font-mono text-center">${item.currentPrice.toFixed(2)}</td>
                          <td className={`py-3 font-mono font-bold text-center ${priceChanged ? 'text-tertiary' : 'text-white'}`}>
                            ${item.recommendedPrice.toFixed(2)}
                          </td>
                          <td className="py-3 text-center">
                            {item.suggestedDiscountPercent > 0 ? (
                              <span className="text-[10px] font-label-caps font-bold px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-500">
                                {item.suggestedDiscountPercent}% {t('adminGlobalIntel.off')}
                              </span>
                            ) : (
                              <span className="text-on-surface-variant/40 font-mono">-</span>
                            )}
                          </td>
                          <td className="py-3 text-end pr-3 max-w-xs truncate text-[11px] text-on-surface-variant font-sans normal-case leading-relaxed">
                            {item.reasoning}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}

      {/* Tab 3: Forecasting & Logistics */}
      {activeTab === 'forecasting' && (
        <div className="space-y-lg text-start">
          {loadingForecasts ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 border-2 border-white/10 border-t-tertiary rounded-full animate-spin text-tertiary mb-sm" />
              <p className="text-on-surface-variant font-label-caps text-xs">{t('adminGlobalIntel.loadingDepletion')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg text-start">
              
              {/* Stock depletion & Restocks (Left) */}
              <div className="lg:col-span-2 space-y-lg text-start">
                <section className="luxury-glass p-6 md:p-8 rounded-xl border border-white/5 space-y-md text-start">
                  <h3 className="font-label-caps text-xs text-white border-b border-white/5 pb-sm">{t('adminGlobalIntel.forecastingTitle')}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-start text-xs">
                      <thead>
                        <tr className="text-outline font-label-caps text-[9px] border-b border-white/5 pb-2">
                          <th className="py-2 text-start">{t('adminGlobalIntel.table.productName')}</th>
                          <th className="py-2 text-start">{t('adminGlobalIntel.table.whCode')}</th>
                          <th className="py-2 text-start">{t('adminGlobalIntel.table.physicalInventory')}</th>
                          <th className="py-2 text-start">{t('adminGlobalIntel.table.depletionDays')}</th>
                          <th className="py-2 text-start">{t('adminGlobalIntel.table.reorderDate')}</th>
                          <th className="py-2 text-start">{t('adminGlobalIntel.table.reorderQty')}</th>
                          <th className="py-2 text-end pr-3">{t('adminGlobalIntel.table.health')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-white/80 font-mono">
                        {forecastsData.inventoryForecasts?.map((inv: any, idx: number) => {
                          const urgent = inv.predictedDepletionDays <= 14;
                          const warning = inv.predictedDepletionDays <= 30 && inv.predictedDepletionDays > 14;
                          return (
                            <tr key={idx} className="hover:bg-white/[0.01]">
                              <td className="py-3 font-sans font-bold text-white uppercase text-xs text-start">{inv.productName}</td>
                              <td className="py-3 text-start">{inv.warehouseCode}</td>
                              <td className="py-3 text-start">{inv.currentStock}</td>
                              <td className={`py-3 font-bold text-start ${urgent ? 'text-red-500' : warning ? 'text-yellow-400' : 'text-green-500'}`}>
                                {inv.predictedDepletionDays} days
                              </td>
                              <td className="py-3 font-sans text-start">{inv.reorderRecommendationDate}</td>
                              <td className="py-3 text-tertiary font-bold text-start">+{inv.reorderQuantity}</td>
                              <td className="py-3 text-end pr-3">
                                <span className={`text-[8px] font-label-caps px-2 py-0.5 rounded-full ${urgent ? 'bg-red-500/10 text-red-500' : warning ? 'bg-yellow-500/10 text-yellow-400' : 'bg-green-500/10 text-green-500'}`}>
                                  {inv.healthScore}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>

              {/* Projections & Growth Rates (Right) */}
              <div className="space-y-lg text-start">
                {/* Category Growth */}
                <section className="luxury-glass p-6 md:p-8 rounded-xl border border-white/5 space-y-md text-start">
                  <h3 className="font-label-caps text-xs text-white border-b border-white/5 pb-sm">{t('adminGlobalIntel.categoryTitle')}</h3>
                  <div className="space-y-sm">
                    {forecastsData.categoryForecasts?.map((c: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center py-1">
                        <span className="text-white text-xs uppercase font-semibold">{c.categoryName}</span>
                        <span className="text-tertiary font-mono text-xs font-bold">+{c.predictedGrowthPercent}% {t('adminGlobalIntel.growth')}</span>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Regional Projections */}
                <section className="luxury-glass p-6 md:p-8 rounded-xl border border-white/5 space-y-md text-start">
                  <h3 className="font-label-caps text-xs text-white border-b border-white/5 pb-sm">{t('adminGlobalIntel.regionalTitle')}</h3>
                  <div className="space-y-sm">
                    {forecastsData.regionalForecasts?.map((r: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center py-1">
                        <span className="text-white text-xs uppercase font-semibold">{r.regionName}</span>
                        <span className="text-tertiary font-mono text-xs font-bold">+{r.predictedGrowthPercent}% {t('adminGlobalIntel.growth')}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

            </div>
          )}
        </div>
      )}

      {/* Tab 4: Customers & Fraud */}
      {activeTab === 'customers' && (
        <div className="space-y-lg text-start">
          {loadingCustomers ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 border-2 border-white/10 border-t-tertiary rounded-full animate-spin text-tertiary mb-sm" />
              <p className="text-on-surface-variant font-label-caps text-xs">{t('adminGlobalIntel.loadingCustomerBehavior')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg text-start">
              
              {/* RFM Segmentation & Churn */}
              <section className="luxury-glass p-6 md:p-8 rounded-xl border border-white/5 space-y-md text-start">
                <h3 className="font-label-caps text-xs text-white border-b border-white/5 pb-sm">{t('adminGlobalIntel.rfmTitle')}</h3>
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto no-scrollbar">
                  <table className="w-full text-start text-xs">
                    <thead>
                      <tr className="text-outline font-label-caps text-[9px] border-b border-white/5 pb-2">
                        <th className="py-2 text-start">{t('adminGlobalIntel.table.customer')}</th>
                        <th className="py-2 text-start">{t('adminGlobalIntel.table.segment')}</th>
                        <th className="py-2 text-center">{t('adminGlobalIntel.table.churnProb')}</th>
                        <th className="py-2 text-end pr-3">{t('adminGlobalIntel.table.retentionAction')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-sans normal-case text-on-surface-variant">
                      {customerData.map((cust) => {
                        const isVIP = cust.segment === 'VIP';
                        const isChurn = cust.segment === 'churn-risk';
                        const isAtRisk = cust.segment === 'at-risk';
                        return (
                          <tr key={cust.userId} className="hover:bg-white/[0.01]">
                            <td className="py-3 text-start">
                              <h4 className="font-bold text-white uppercase text-xs">{cust.userName}</h4>
                              <p className="text-[10px] text-on-surface-variant/40 font-mono mt-0.5">{cust.email}</p>
                            </td>
                            <td className="py-3 text-start">
                              <span className={`text-[8px] font-label-caps px-2 py-0.5 rounded-full ${
                                isVIP ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold' :
                                isChurn ? 'bg-red-500/10 border border-red-500/20 text-red-500' :
                                isAtRisk ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400' :
                                'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                              }`}>
                                {cust.segment.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-3 font-mono text-center font-bold text-white">{cust.churnScore}%</td>
                            <td className="py-3 text-end pr-3 max-w-xs truncate text-[11px] text-on-surface-variant leading-relaxed">
                              {cust.retentionAdvice}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Fraud risk logs */}
              <section className="luxury-glass p-6 md:p-8 rounded-xl border border-white/5 space-y-md text-start">
                <h3 className="font-label-caps text-xs text-white border-b border-white/5 pb-sm">{t('adminGlobalIntel.abuseTitle')}</h3>
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto no-scrollbar">
                  <table className="w-full text-start text-xs">
                    <thead>
                      <tr className="text-outline font-label-caps text-[9px] border-b border-white/5 pb-2">
                        <th className="py-2 text-start">{t('adminGlobalIntel.table.orderId')}</th>
                        <th className="py-2 text-start">{t('adminGlobalIntel.table.customer')}</th>
                        <th className="py-2 text-start">{t('adminGlobalIntel.table.abuseCategory')}</th>
                        <th className="py-2 text-center">{t('adminGlobalIntel.table.risk')}</th>
                        <th className="py-2 text-end pr-3">{t('adminGlobalIntel.table.reason')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-sans normal-case text-on-surface-variant">
                      {fraudData.map((f, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.01]">
                          <td className="py-3 font-mono text-white text-xs text-start">{f.orderNumber}</td>
                          <td className="py-3 font-bold text-white/80 text-start">{f.customerName}</td>
                          <td className="py-3 text-start">
                            <span className={`text-[8px] font-label-caps px-2 py-0.5 rounded-full ${
                              f.abuseType !== 'none' ? 'bg-red-500/10 border border-red-500/20 text-red-500' : 'bg-green-500/10 border border-green-500/20 text-green-500'
                            }`}>
                              {f.abuseType.replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 font-mono text-center font-bold">{f.riskScore}%</td>
                          <td className="py-3 text-end pr-3 max-w-xs truncate text-[11px] text-on-surface-variant leading-relaxed">
                            {f.reasoning}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

            </div>
          )}
        </div>
      )}

      {/* Tab 5: Campaign Generator Studio */}
      {activeTab === 'campaign' && (
        <div className="space-y-lg text-start">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg text-start">
            
            {/* Form Settings (Left) */}
            <div className="space-y-lg">
              <section className="luxury-glass p-6 md:p-8 rounded-xl border border-white/5 space-y-md text-start">
                <h3 className="font-label-caps text-xs text-white border-b border-white/5 pb-sm">{t('adminGlobalIntel.campaignParams')}</h3>
                
                <form onSubmit={handleGenerateCampaign} className="space-y-md text-xs font-sans text-start">
                  
                  {/* Name */}
                  <div className="space-y-xs text-start">
                    <label className="text-[9px] font-label-caps text-outline">{t('adminGlobalIntel.campaignTitle')}</label>
                    <input
                      type="text"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      className="w-full bg-[#111] border border-white/10 rounded-lg py-3 px-3.5 text-white outline-none focus:border-tertiary"
                      required
                    />
                  </div>

                  {/* Target Audience Segment */}
                  <div className="space-y-xs text-start">
                    <label className="text-[9px] font-label-caps text-outline">{t('adminGlobalIntel.targetSegment')}</label>
                    <select
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                      className="w-full bg-[#111] border border-white/10 rounded-lg py-3 px-3.5 text-white"
                    >
                      <option value="VIP Customers">{t('adminGlobalIntel.vipCustomers')}</option>
                      <option value="Loyal Customers">{t('adminGlobalIntel.loyalCustomers')}</option>
                      <option value="At-Risk Customers">{t('adminGlobalIntel.atRiskCustomers')}</option>
                      <option value="Churn-Risk Segments">{t('adminGlobalIntel.churnRiskCustomers')}</option>
                    </select>
                  </div>

                  {/* Featured Products MultiSelect */}
                  <div className="space-y-xs text-start">
                    <label className="text-[9px] font-label-caps text-outline">{t('adminGlobalIntel.promotedProducts')}</label>
                    <div className="max-h-36 overflow-y-auto border border-white/10 rounded-lg p-2 space-y-sm bg-[#111] no-scrollbar">
                      {products.map(p => {
                        const checked = selectedProductNames.includes(p.name);
                        return (
                          <div key={p.id} className="flex items-center gap-sm text-start">
                            <input
                              type="checkbox"
                              id={`p-chk-${p.id}`}
                              checked={checked}
                              onChange={() => {
                                if (checked) {
                                  setSelectedProductNames(prev => prev.filter(name => name !== p.name));
                                } else {
                                  setSelectedProductNames(prev => [...prev, p.name]);
                                }
                              }}
                              className="rounded border-white/10 bg-background text-tertiary focus:ring-0 cursor-pointer w-4 h-4"
                            />
                            <label htmlFor={`p-chk-${p.id}`} className="text-white text-[11px] uppercase truncate cursor-pointer font-bold">
                              {p.name}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Incentive Description */}
                  <div className="space-y-xs text-start">
                    <label className="text-[9px] font-label-caps text-outline">{t('adminGlobalIntel.promoOffer')}</label>
                    <input
                      type="text"
                      value={incentive}
                      onChange={(e) => setIncentive(e.target.value)}
                      className="w-full bg-[#111] border border-white/10 rounded-lg py-3 px-3.5 text-white outline-none focus:border-tertiary"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={generatingCampaign}
                    className="w-full py-4 bg-tertiary text-black hover:brightness-105 rounded-lg font-button text-xs uppercase flex items-center justify-center gap-xs disabled:opacity-50 font-bold"
                  >
                    {generatingCampaign ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {t('adminGlobalIntel.generateCopy')}
                  </button>

                </form>
              </section>
            </div>

            {/* Campaign Output (Right) */}
            <div className="lg:col-span-2 space-y-lg text-start">
              <section className="luxury-glass p-6 md:p-8 rounded-xl border border-white/5 space-y-md min-h-[500px] text-start">
                <h3 className="font-label-caps text-xs text-white border-b border-white/5 pb-sm">{t('adminGlobalIntel.generatedMarketing')}</h3>
                
                {generatingCampaign ? (
                  <div className="h-96 flex flex-col items-center justify-center space-y-md">
                    <Loader2 className="w-8 h-8 border-2 border-white/10 border-t-tertiary rounded-full animate-spin text-tertiary" />
                    <p className="text-on-surface-variant font-label-caps text-xs">{t('adminGlobalIntel.loadingCopywriting')}</p>
                  </div>
                ) : campaignOutput ? (
                  <div className="space-y-xl font-sans normal-case text-xs text-on-surface-variant leading-relaxed text-start">
                    
                    {/* Subject & Banner */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-lg text-start">
                      <div className="space-y-xs text-start">
                        <span className="font-label-caps text-[9px] text-outline">{t('adminGlobalIntel.subject')}</span>
                        <p className="text-white font-bold text-sm bg-[#111] p-3 rounded-lg border border-white/5 text-start">{campaignOutput.subject}</p>
                      </div>
                      <div className="space-y-xs text-start">
                        <span className="font-label-caps text-[9px] text-outline">{t('adminGlobalIntel.banner')}</span>
                        <p className="text-white font-bold text-sm bg-[#111] p-3 rounded-lg border border-white/5 text-start">{campaignOutput.bannerHeader}</p>
                      </div>
                    </div>

                    {/* Subtitle & SMS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-lg text-start">
                      <div className="space-y-xs text-start">
                        <span className="font-label-caps text-[9px] text-outline">{t('adminGlobalIntel.sms')}</span>
                        <p className="text-white bg-[#111] p-3 rounded-lg border border-white/5 font-mono text-start">{campaignOutput.smsBody}</p>
                      </div>
                      <div className="space-y-xs text-start">
                        <span className="font-label-caps text-[9px] text-outline">{t('adminGlobalIntel.social')}</span>
                        <p className="text-white bg-[#111] p-3 rounded-lg border border-white/5 text-start">{campaignOutput.socialAdCopy}</p>
                      </div>
                    </div>

                    {/* Email body HTML */}
                    <div className="space-y-xs text-start">
                      <span className="font-label-caps text-[9px] text-outline">{t('adminGlobalIntel.emailTemplate')}</span>
                      <div className="border border-white/10 rounded-lg overflow-hidden bg-black p-4 max-h-[350px] overflow-y-auto no-scrollbar text-start">
                        <div dangerouslySetInnerHTML={{ __html: campaignOutput.emailBodyHtml }} />
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="h-96 flex flex-col items-center justify-center space-y-sm text-center">
                    <FileText className="h-10 w-10 text-white/15" />
                    <h4 className="font-headline-lg text-white uppercase text-xs">{t('adminGlobalIntel.studioReady')}</h4>
                    <p className="text-xs text-on-surface-variant max-w-sm">{t('adminGlobalIntel.studioDesc')}</p>
                  </div>
                )}
              </section>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
