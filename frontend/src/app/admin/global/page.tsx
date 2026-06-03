'use client';

import React, { useState, useEffect } from 'react';
import { useProductsQuery } from '../../../hooks/useProducts';
import { Loader2, Globe, Boxes, Truck, Sparkles, Send, RefreshCw, Layers, AlertCircle, ArrowRightLeft } from 'lucide-react';
import { apiClient } from '../../../lib/api-client';
import { useToast } from '../../../providers/ToastProvider';
import { useTranslation } from '../../../providers/I18nProvider';

export default function AdminGlobalCommercePage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { data: products = [], isLoading: productsLoading } = useProductsQuery();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'warehouses' | 'transfers' | 'ai-insights'>('overview');

  // Backend States
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  const [regions, setRegions] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [aiReport, setAiReport] = useState<string>('');

  // Loading States
  const [loadingRates, setLoadingRates] = useState(true);
  const [loadingWarehouses, setLoadingWarehouses] = useState(true);
  const [loadingTransfers, setLoadingTransfers] = useState(true);
  const [loadingAi, setLoadingAi] = useState(false);
  const [transferSubmitting, setTransferSubmitting] = useState(false);

  // Form fields for stock transfers
  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [transferProductId, setTransferProductId] = useState('');
  const [transferQuantity, setTransferQuantity] = useState(10);
  const [transferNotes, setTransferNotes] = useState('');

  // Fetch Exchange Rates & Region List
  const fetchGlobalConfigs = async () => {
    setLoadingRates(true);
    try {
      const [ratesRes, regionRes] = await Promise.all([
        apiClient.get('/currency/rates?base=USD'),
        apiClient.get('/region/list'),
      ]);
      if (ratesRes.data) {
        setExchangeRates(ratesRes.data.rates || ratesRes.data);
      }
      if (regionRes.data) {
        setRegions(regionRes.data.regions || []);
        setCountries(regionRes.data.countries || []);
      }
    } catch (err) {
      console.error('Failed to load exchange rates or regions', err);
      showToast(t('adminGlobal.toast.ratesFailed'), 'error');
    } finally {
      setLoadingRates(false);
    }
  };

  // Fetch Warehouses & Stocks
  const fetchWarehouses = async () => {
    setLoadingWarehouses(true);
    try {
      const res = await apiClient.get('/warehouse/list');
      setWarehouses(res.data || []);
    } catch (err) {
      console.error('Failed to load warehouses', err);
      showToast(t('adminGlobal.toast.warehouseFailed'), 'error');
    } finally {
      setLoadingWarehouses(false);
    }
  };

  // Fetch Transfers log
  const fetchTransfers = async () => {
    setLoadingTransfers(true);
    try {
      const res = await apiClient.get('/warehouse/transfers');
      setTransfers(res.data || []);
    } catch (err) {
      console.error('Failed to load transfers log', err);
    } finally {
      setLoadingTransfers(false);
    }
  };

  // Fetch AI Insights report from Groq
  const fetchAiInsights = async (force = false) => {
    if (aiReport && !force) return;
    setLoadingAi(true);
    try {
      const res = await apiClient.get('/warehouse/ai-insights');
      setAiReport(res.data.report || 'AI report is not available at this moment.');
    } catch (err) {
      console.error('Failed to load AI insights', err);
      setAiReport('Could not generate dynamic Groq insights. Ensure GROQ_API_KEY is configured on NestJS server.');
    } finally {
      setLoadingAi(false);
    }
  };

  useEffect(() => {
    fetchGlobalConfigs();
    fetchWarehouses();
    fetchTransfers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle Tab changes
  useEffect(() => {
    if (activeTab === 'warehouses') {
      fetchWarehouses();
    } else if (activeTab === 'transfers') {
      fetchTransfers();
    } else if (activeTab === 'ai-insights') {
      fetchAiInsights();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Handle stock transfer submission
  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromWarehouseId || !toWarehouseId || !transferProductId || transferQuantity <= 0) {
      showToast(t('adminGlobal.toast.paramsRequired'), 'error');
      return;
    }
    if (fromWarehouseId === toWarehouseId) {
      showToast(t('adminGlobal.toast.diffWhRequired'), 'error');
      return;
    }

    setTransferSubmitting(true);
    try {
      await apiClient.post('/warehouse/transfer', {
        fromWarehouseId,
        toWarehouseId,
        productId: transferProductId,
        quantity: Number(transferQuantity),
        notes: transferNotes,
      });

      showToast(t('adminGlobal.toast.transferSuccess'), 'success');
      setTransferQuantity(10);
      setTransferNotes('');
      fetchWarehouses();
      fetchTransfers();
      setActiveTab('transfers');
    } catch (err: any) {
      showToast(err.response?.data?.message || t('adminGlobal.toast.mutationFailed'), 'error');
    } finally {
      setTransferSubmitting(false);
    }
  };

  return (
    <div className="space-y-xl text-start">
      {/* Page Header */}
      <div className="border-b border-white/5 pb-lg flex flex-col md:flex-row md:justify-between md:items-end gap-md">
        <div>
          <h1 className="font-display-lg text-3xl md:text-5xl text-white uppercase tracking-tight">{t('adminGlobal.title')}</h1>
          <p className="text-on-surface-variant text-sm font-sans normal-case mt-sm">
            {t('adminGlobal.desc')}
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex flex-wrap gap-xs">
          {[
            { id: 'overview', label: t('adminGlobal.tabs.regions'), icon: Globe },
            { id: 'warehouses', label: t('adminGlobal.tabs.warehouses'), icon: Boxes },
            { id: 'transfers', label: t('adminGlobal.tabs.transfers'), icon: ArrowRightLeft },
            { id: 'ai-insights', label: t('adminGlobal.tabs.ai'), icon: Sparkles },
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
                <Icon className="h-4.5 w-4.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: Overview & Exchange Rates */}
      {activeTab === 'overview' && (
        <div className="space-y-lg">
          {loadingRates ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 border-2 border-white/10 border-t-tertiary rounded-full animate-spin mb-sm" />
              <p className="text-on-surface-variant font-label-caps text-xs">{t('adminGlobal.loadingRegional')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg text-start">
              
              {/* Exchange Rates Panel */}
              <section className="luxury-glass p-6 md:p-8 rounded-xl border border-white/5 space-y-md">
                <div className="flex justify-between items-center border-b border-white/5 pb-sm">
                  <h3 className="font-label-caps text-xs text-white">{t('adminGlobal.dynamicRates')}</h3>
                  <button 
                    onClick={fetchGlobalConfigs}
                    className="p-1.5 border border-white/5 rounded-md hover:bg-white/5 text-on-surface-variant hover:text-white transition-all"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-start text-xs">
                    <thead>
                      <tr className="text-outline font-label-caps text-[9px] border-b border-white/5 pb-2">
                        <th className="py-2 text-start">{t('adminGlobal.table.currency')}</th>
                        <th className="py-2 text-start">{t('adminGlobal.table.symbol')}</th>
                        <th className="py-2 text-start">{t('adminGlobal.table.conversion')}</th>
                        <th className="py-2 text-start">{t('adminGlobal.table.status')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono text-white/80">
                      {[
                        { code: 'USD', name: 'US Dollar', symbol: '$', rate: exchangeRates.USD || 1.0 },
                        { code: 'EUR', name: 'Euro', symbol: '€', rate: exchangeRates.EUR || 0.92 },
                        { code: 'GBP', name: 'British Pound', symbol: '£', rate: exchangeRates.GBP || 0.79 },
                        { code: 'AED', name: 'UAE Dirham', symbol: 'AED', rate: exchangeRates.AED || 3.67 },
                        { code: 'SAR', name: 'Saudi Riyal', symbol: 'SAR', rate: exchangeRates.SAR || 3.75 },
                        { code: 'EGP', name: 'Egypt Pound', symbol: 'EGP', rate: exchangeRates.EGP || 47.50 },
                      ].map((curr) => (
                        <tr key={curr.code} className="hover:bg-white/[0.01]">
                          <td className="py-3 font-sans font-bold text-white text-start">{curr.code} ({curr.name})</td>
                          <td className="py-3 text-start">{curr.symbol}</td>
                          <td className="py-3 text-start">1 USD = {curr.rate.toFixed(4)} {curr.code}</td>
                          <td className="py-3 text-start">
                            <span className="text-[8px] font-label-caps px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-500">
                              {t('admin.activeStatus')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Regions Config */}
              <section className="luxury-glass p-6 md:p-8 rounded-xl border border-white/5 space-y-md">
                <h3 className="font-label-caps text-xs text-white border-b border-white/5 pb-sm">{t('adminGlobal.supportedRegions')}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-start text-xs">
                    <thead>
                      <tr className="text-outline font-label-caps text-[9px] border-b border-white/5 pb-2">
                        <th className="py-2 text-start">{t('adminGlobal.table.region')}</th>
                        <th className="py-2 text-start">{t('adminGlobal.table.code')}</th>
                        <th className="py-2 text-start">{t('adminGlobal.table.currency')}</th>
                        <th className="py-2 text-start">{t('adminGlobal.table.taxType')}</th>
                        <th className="py-2 text-start">{t('adminGlobal.table.taxRate')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-white/80 font-mono">
                      {regions.map((reg) => (
                        <tr key={reg.id} className="hover:bg-white/[0.01]">
                          <td className="py-3 font-sans font-bold text-white text-start">{reg.name}</td>
                          <td className="py-3 uppercase text-start">{reg.code}</td>
                          <td className="py-3 text-start">{reg.currencyCode}</td>
                          <td className="py-3 uppercase font-sans text-xs text-start">{reg.taxType}</td>
                          <td className="py-3 text-start">{(reg.taxRate * 100).toFixed(1)}%</td>
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

      {/* Tab 2: Warehouses & Stock Levels */}
      {activeTab === 'warehouses' && (
        <div className="space-y-lg text-start">
          {loadingWarehouses ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 border-2 border-white/10 border-t-tertiary rounded-full animate-spin mb-sm" />
              <p className="text-on-surface-variant font-label-caps text-xs">{t('adminGlobal.loadingWarehouses')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-lg">
              
              {/* List Warehouses (Left Side) */}
              <div className="xl:col-span-2 space-y-lg">
                {warehouses.map((wh) => (
                  <section key={wh.id} className="luxury-glass p-6 md:p-8 rounded-xl border border-white/5 space-y-md text-start">
                    <div className="flex justify-between items-center border-b border-white/5 pb-sm">
                      <div>
                        <h3 className="font-bold text-white uppercase text-sm flex items-center gap-xs">
                          {wh.name}
                          <span className="text-[9px] font-mono font-normal text-tertiary border border-tertiary/20 px-1.5 py-0.5 rounded">
                            {wh.code}
                          </span>
                        </h3>
                        <p className="text-[10px] text-on-surface-variant normal-case font-sans mt-0.5">{wh.address}, {wh.city} ({wh.countryCode})</p>
                      </div>
                      <span className={`text-[8px] font-label-caps px-2 py-0.5 rounded-full ${wh.isActive ? 'bg-green-500/10 border border-green-500/20 text-green-500' : 'bg-red-500/10 border border-red-500/20 text-red-500'}`}>
                        {wh.isActive ? t('adminGlobal.operational') : t('adminGlobal.offline')}
                      </span>
                    </div>

                    <div className="overflow-x-auto max-h-60 overflow-y-auto no-scrollbar">
                      <table className="w-full text-start text-xs">
                        <thead>
                          <tr className="text-outline font-label-caps text-[9px] border-b border-white/5 pb-2">
                            <th className="py-2 text-start">{t('adminGlobal.table.productName')}</th>
                            <th className="py-2 text-start">{t('adminGlobal.table.physicalStock')}</th>
                            <th className="py-2 text-start">{t('adminGlobal.table.reservedStock')}</th>
                            <th className="py-2 text-start">{t('adminGlobal.table.available')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 font-sans normal-case text-on-surface-variant">
                          {wh.inventories && wh.inventories.map((inv: any) => {
                            const prod = products.find(p => p.id === inv.productId);
                            const productName = prod ? prod.name : `${t('adminCatalogIntelligence.unclassified')} (${inv.productId})`;
                            const available = inv.quantity - inv.reservedQty;
                            
                            return (
                              <tr key={inv.id} className="hover:bg-white/[0.01]">
                                <td className="py-2.5 font-bold text-white uppercase text-xs text-start">{productName}</td>
                                <td className="py-2.5 font-mono text-start">{inv.quantity}</td>
                                <td className="py-2.5 font-mono text-yellow-400 text-start">{inv.reservedQty}</td>
                                <td className="py-2.5 font-mono font-bold text-tertiary text-start">{available}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </section>
                ))}
              </div>

              {/* Transfer Form (Right Side Sidebar) */}
              <div className="space-y-lg">
                <section className="luxury-glass p-6 md:p-8 rounded-xl border border-white/5 space-y-lg sticky top-24 text-start">
                  <div>
                    <h3 className="font-label-caps text-xs text-white border-b border-white/5 pb-sm">{t('adminGlobal.deductStock')}</h3>
                    <p className="text-[10px] text-on-surface-variant font-sans normal-case mt-sm">
                      {t('adminGlobal.transferDesc')}
                    </p>
                  </div>

                  <form onSubmit={handleTransferSubmit} className="space-y-md text-start">
                    {/* Product */}
                    <div className="space-y-xs">
                      <label className="text-[9px] font-label-caps text-outline">{t('adminGlobal.productToMove')}</label>
                      <select
                        value={transferProductId}
                        onChange={(e) => setTransferProductId(e.target.value)}
                        className="w-full bg-[#111] border border-white/10 rounded-lg py-3.5 px-3 text-white text-xs"
                        required
                      >
                        <option value="">{t('adminGlobal.selectProduct')}</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>

                    {/* From Warehouse */}
                    <div className="space-y-xs">
                      <label className="text-[9px] font-label-caps text-outline">{t('adminGlobal.fromSourceWh')}</label>
                      <select
                        value={fromWarehouseId}
                        onChange={(e) => setFromWarehouseId(e.target.value)}
                        className="w-full bg-[#111] border border-white/10 rounded-lg py-3.5 px-3 text-white text-xs"
                        required
                      >
                        <option value="">{t('adminGlobal.selectSource')}</option>
                        {warehouses.map(w => (
                          <option key={w.id} value={w.id}>{w.name.toUpperCase()} ({w.code})</option>
                        ))}
                      </select>
                    </div>

                    {/* To Warehouse */}
                    <div className="space-y-xs">
                      <label className="text-[9px] font-label-caps text-outline">{t('adminGlobal.toTargetWh')}</label>
                      <select
                        value={toWarehouseId}
                        onChange={(e) => setToWarehouseId(e.target.value)}
                        className="w-full bg-[#111] border border-white/10 rounded-lg py-3.5 px-3 text-white text-xs"
                        required
                      >
                        <option value="">{t('adminGlobal.selectDest')}</option>
                        {warehouses.map(w => (
                          <option key={w.id} value={w.id}>{w.name.toUpperCase()} ({w.code})</option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity */}
                    <div className="space-y-xs">
                      <label className="text-[9px] font-label-caps text-outline">{t('adminGlobal.stockTransferQty')}</label>
                      <input
                        type="number"
                        min="1"
                        value={transferQuantity}
                        onChange={(e) => setTransferQuantity(parseInt(e.target.value) || 0)}
                        className="w-full bg-[#111] border border-white/10 rounded-lg py-3.5 px-3 text-white text-xs font-mono"
                        required
                      />
                    </div>

                    {/* Notes */}
                    <div className="space-y-xs">
                      <label className="text-[9px] font-label-caps text-outline">{t('adminGlobal.auditSystemNotes')}</label>
                      <input
                        type="text"
                        placeholder="e.g., Seasonal regional demand supply"
                        value={transferNotes}
                        onChange={(e) => setTransferNotes(e.target.value)}
                        className="w-full bg-[#111] border border-white/10 rounded-lg py-3.5 px-3 text-white text-xs normal-case font-sans"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={transferSubmitting}
                      className="w-full py-4 bg-tertiary text-black hover:brightness-105 rounded-lg font-button text-xs uppercase flex items-center justify-center gap-xs disabled:opacity-50"
                    >
                      {transferSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      {t('adminGlobal.routingLogisticsTransfer')}
                    </button>
                  </form>
                </section>
              </div>

            </div>
          )}
        </div>
      )}

      {/* Tab 3: Transfers Log */}
      {activeTab === 'transfers' && (
        <div className="space-y-lg">
          {loadingTransfers ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 border-2 border-white/10 border-t-tertiary rounded-full animate-spin mb-sm" />
              <p className="text-on-surface-variant font-label-caps text-xs">{t('adminGlobal.loadingTransfers')}</p>
            </div>
          ) : (
            <section className="luxury-glass p-6 md:p-8 rounded-xl border border-white/5 text-start">
              <div className="flex justify-between items-center border-b border-white/5 pb-sm mb-md">
                <h3 className="font-label-caps text-xs text-white">{t('adminGlobal.logisticsMovementLog')}</h3>
                <button 
                  onClick={fetchTransfers}
                  className="p-1.5 border border-white/5 rounded-md hover:bg-white/5 text-on-surface-variant hover:text-white transition-all"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>

              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-start text-xs">
                  <thead>
                    <tr className="text-outline font-label-caps text-[9px] border-b border-white/5 pb-3">
                      <th className="py-2.5 text-start">{t('adminGlobal.table.timestamp')}</th>
                      <th className="py-2.5 text-start">{t('adminGlobal.table.product')}</th>
                      <th className="py-2.5 text-start">{t('adminGlobal.table.sourceWh')}</th>
                      <th className="py-2.5 text-start">{t('adminGlobal.table.targetWh')}</th>
                      <th className="py-2.5 text-start">{t('adminGlobal.table.qty')}</th>
                      <th className="py-2.5 text-start">{t('adminGlobal.table.notes')}</th>
                      <th className="py-2.5 text-end pr-3">{t('adminGlobal.table.routeStatus')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-sans normal-case text-on-surface-variant">
                    {transfers.map((tx) => (
                      <tr key={tx.id} className="hover:bg-white/[0.01] font-mono text-xs text-white/80">
                        <td className="py-4 text-on-surface-variant/80 font-sans text-start">{new Date(tx.createdAt).toLocaleString()}</td>
                        <td className="py-4 font-sans font-bold text-white uppercase text-start">{tx.product ? tx.product.name : 'N/A'}</td>
                        <td className="py-4 font-sans text-start">{tx.fromWarehouse ? tx.fromWarehouse.name : 'N/A'} ({tx.fromWarehouse?.code})</td>
                        <td className="py-4 font-sans text-start">{tx.toWarehouse ? tx.toWarehouse.name : 'N/A'} ({tx.toWarehouse?.code})</td>
                        <td className="py-4 font-bold text-tertiary text-start">{tx.quantity} {t('adminGlobal.units')}</td>
                        <td className="py-4 text-on-surface-variant normal-case font-sans italic text-xs max-w-xs truncate text-start">{tx.notes || '—'}</td>
                        <td className="py-4 text-end pr-3">
                          <span className="text-[8px] font-label-caps px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-500">
                            {tx.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {transfers.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-on-surface-variant/40 font-mono">
                          {t('adminGlobal.table.noTransactions')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}

      {/* Tab 4: AI Insights */}
      {activeTab === 'ai-insights' && (
        <div className="space-y-lg animate-fade-in text-start">
          <section className="luxury-glass p-6 md:p-8 rounded-xl border border-white/5 space-y-lg">
            <div className="flex justify-between items-center border-b border-white/5 pb-sm">
              <div className="flex items-center gap-xs">
                <Sparkles className="h-5 w-5 text-tertiary" />
                <h3 className="font-label-caps text-xs text-white">{t('adminGlobal.rebalancerTitle')}</h3>
              </div>
              <button 
                onClick={() => fetchAiInsights(true)}
                disabled={loadingAi}
                className="p-1.5 border border-white/5 rounded-md hover:bg-white/5 text-on-surface-variant hover:text-white transition-all disabled:opacity-50"
                title="Regenerate Insights"
              >
                {loadingAi ? <Loader2 className="h-4 w-4 animate-spin text-tertiary" /> : <RefreshCw className="h-4 w-4" />}
              </button>
            </div>

            {loadingAi ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-md">
                <Loader2 className="w-8 h-8 border-2 border-white/10 border-t-tertiary rounded-full animate-spin text-tertiary" />
                <p className="text-on-surface-variant font-label-caps text-xs">{t('adminGlobal.resolvingTopology')}</p>
              </div>
            ) : (
              <div className="space-y-md">
                <div className="flex items-start gap-sm p-4 bg-tertiary/5 border border-tertiary/10 rounded-lg text-start">
                  <AlertCircle className="h-5 w-5 text-tertiary shrink-0 mt-0.5" />
                  <div className="text-xs text-on-surface-variant font-sans normal-case leading-relaxed">
                    <strong className="text-white">{t('adminGlobal.activeInsight')}: </strong>
                    {t('adminGlobal.insightDesc')}
                  </div>
                </div>

                <div className="bg-[#050505] p-6 rounded-xl border border-white/5 overflow-x-auto text-start">
                  <pre className="text-xs text-white/90 whitespace-pre-wrap font-mono leading-relaxed max-w-full text-start">
                    {aiReport}
                  </pre>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
