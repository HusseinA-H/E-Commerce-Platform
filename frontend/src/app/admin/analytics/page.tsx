'use client';

import React from 'react';
import { useAdminAnalyticsSalesQuery, useAdminAIInsightsQuery } from '../../../hooks/useAdmin';
import { Loader2, Sparkles, Brain, Bot, RefreshCw } from 'lucide-react';
import { useTranslation } from '../../../providers/I18nProvider';

export default function AdminAnalyticsPage() {
  const { data: salesData, isLoading } = useAdminAnalyticsSalesQuery();
  const { data: aiInsightsData, isLoading: isLoadingAI, refetch: refetchAI, isRefetching: isRefetchingAI } = useAdminAIInsightsQuery();
  const { locale, t } = useTranslation();

  const formatPrice = (price: number) => {
    return price.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'EGP',
    });
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US');
  };

  // KPIs
  const kpis = [
    { label: t('adminAnalytics.conversionRate'), value: '3.42%', trend: t('adminAnalytics.conversionTrend'), color: 'text-tertiary' },
    { label: t('adminAnalytics.avgOrderValue'), value: formatPrice(184.50), trend: t('adminAnalytics.stableGrowth'), color: 'text-white' },
    { label: t('adminAnalytics.cartAbandonment'), value: '62.4%', trend: t('adminAnalytics.abandonmentTrend'), color: 'text-red-400' },
    { label: t('adminAnalytics.bounceRate'), value: '28.1%', trend: t('adminAnalytics.bounceTrend'), color: 'text-blue-400' }
  ];

  if (isLoading || !salesData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-md">
        <Loader2 className="w-8 h-8 border-2 border-white/10 border-t-tertiary rounded-full animate-spin" />
        <p className="text-on-surface-variant font-label-caps text-xs">{t('adminAnalytics.loadingTelemetry')}</p>
      </div>
    );
  }

  const { categoryDistribution = [], trafficSources = [] } = salesData;

  return (
    <div className="space-y-xl text-start">
      
      {/* Header */}
      <div>
        <h1 className="font-display-lg text-3xl md:text-5xl text-white uppercase tracking-tight">{t('adminAnalytics.title')}</h1>
        <p className="text-on-surface-variant text-sm font-sans normal-case mt-sm">
          {t('adminAnalytics.desc')}
        </p>
      </div>

      {/* AI Insights Card */}
      <section className="bg-gradient-to-r from-tertiary/10 via-background to-background border border-tertiary/20 p-6 md:p-8 rounded-xl space-y-md text-left relative overflow-hidden">
        <div className="absolute right-0 top-0 w-32 h-32 bg-tertiary/5 rounded-full blur-2xl"></div>
        <div className="flex justify-between items-start gap-md border-b border-white/5 pb-sm">
          <div className="flex items-center gap-sm">
            <div className="p-2 bg-tertiary/10 text-tertiary rounded-lg">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-headline-lg text-md text-white uppercase flex items-center gap-xs">{t('adminAnalytics.insightsBriefing')}</h3>
              <p className="text-[10px] text-on-surface-variant/50 font-sans mt-0.5 normal-case">{t('adminAnalytics.insightsDesc')}</p>
            </div>
          </div>
          
          <button
            onClick={() => refetchAI()}
            disabled={isLoadingAI || isRefetchingAI}
            className="px-3 py-1.5 border border-white/10 rounded text-[9px] font-label-caps text-white bg-white/[0.01] hover:bg-white/[0.02] flex items-center gap-xs cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isLoadingAI || isRefetchingAI ? 'animate-spin' : ''}`} />
            {t('adminAnalytics.reAnalyze')}
          </button>
        </div>

        {isLoadingAI || isRefetchingAI ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-sm">
            <Loader2 className="w-6 h-6 text-tertiary animate-spin" />
            <p className="text-[10px] font-label-caps text-on-surface-variant">{t('adminAnalytics.runningSynthesis')}</p>
          </div>
        ) : aiInsightsData?.insights ? (
          <div className="text-xs text-on-surface-variant font-sans normal-case leading-relaxed space-y-sm max-w-none pr-md max-h-60 overflow-y-auto no-scrollbar">
            {aiInsightsData.insights.split('\n').map((line: string, i: number) => {
              if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
                return <li key={i} className="list-disc ml-4 text-white uppercase font-bold text-[10px] tracking-wide mt-1">{line.replace(/^[\s-*]+/, '')}</li>;
              }
              if (line.trim().startsWith('###') || line.trim().startsWith('##')) {
                return <h4 key={i} className="text-white font-headline-lg text-xs uppercase pt-2 border-b border-white/5 pb-1 font-bold">{line.replace(/^(###|##)\s*/, '')}</h4>;
              }
              if (line.trim() === '') return <div key={i} className="h-2"></div>;
              return <p key={i} className="text-[11px] leading-relaxed text-on-surface-variant">{line}</p>;
            })}
          </div>
        ) : (
          <p className="text-on-surface-variant/40 text-[10px] font-mono">{t('adminAnalytics.noInsights')}</p>
        )}
      </section>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-lg">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="luxury-glass p-6 rounded-xl border border-white/5 space-y-md text-start">
            <span className="font-label-caps text-[10px] text-on-surface-variant/60 block">{kpi.label}</span>
            <div className="space-y-xs">
              <h2 className="text-white text-2xl font-display-lg">{kpi.value}</h2>
              <p className="text-[10px] font-label-caps text-on-surface-variant/40 tracking-wider">
                {kpi.trend}
              </p>
            </div>
          </div>
        ))}
      </section>

      {/* Analytics Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-xl text-start">
        
        {/* Chart 1: Category Distribution */}
        <div className="luxury-glass p-6 md:p-8 rounded-xl border border-white/5 space-y-lg flex flex-col justify-between">
          <div>
            <h3 className="font-headline-lg text-lg text-white uppercase">{t('adminAnalytics.categoryDistribution')}</h3>
            <p className="text-[11px] text-on-surface-variant/40 font-sans normal-case mt-0.5">{t('adminAnalytics.categoryDesc')}</p>
          </div>
          
          <div className="space-y-md pt-4 flex-1 flex flex-col justify-center">
            {categoryDistribution.map((cat: any) => {
              const capName = cat.name ? cat.name.charAt(0).toUpperCase() + cat.name.slice(1) : '';
              const localizedCat = t('shop.cat' + capName, { defaultValue: cat.name });
              return (
                <div key={cat.name} className="space-y-xs">
                  <div className="flex justify-between text-[11px]">
                    <span className="font-label-caps text-white">{localizedCat.toUpperCase()}</span>
                    <span className="font-mono text-tertiary">{formatNumber(cat.value)} {t('vendor.itemsCountLabel')} ({formatNumber(cat.percentage)}%)</span>
                  </div>
                  <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-tertiary h-full rounded-full transition-all duration-500" 
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {categoryDistribution.length === 0 && (
              <p className="text-on-surface-variant/40 text-xs text-center py-10">{t('adminAnalytics.noCategorySales')}</p>
            )}
          </div>
        </div>

        {/* Chart 2: Traffic Channels */}
        <div className="luxury-glass p-6 md:p-8 rounded-xl border border-white/5 space-y-lg">
          <div>
            <h3 className="font-headline-lg text-lg text-white uppercase">{t('adminAnalytics.trafficAttribution')}</h3>
            <p className="text-[11px] text-on-surface-variant/40 font-sans normal-case mt-0.5">{t('adminAnalytics.trafficDesc')}</p>
          </div>

          {/* SVG Bar Chart representation */}
          <div className="w-full h-72 pt-4 flex items-end">
            <svg viewBox="0 0 400 200" className="w-full h-full text-on-surface-variant">
              {/* Grid lines */}
              <line x1="40" y1="20" x2="380" y2="20" stroke="rgba(255,255,255,0.03)" />
              <line x1="40" y1="70" x2="380" y2="70" stroke="rgba(255,255,255,0.03)" />
              <line x1="40" y1="120" x2="380" y2="120" stroke="rgba(255,255,255,0.03)" />
              <line x1="40" y1="170" x2="380" y2="170" stroke="rgba(255,255,255,0.1)" />

              {trafficSources.map((source: any, index: number) => {
                const totalVisitors = trafficSources.reduce((sum: number, s: any) => sum + s.visitors, 0);
                const percentage = totalVisitors > 0 ? (source.visitors / totalVisitors) * 100 : 0;
                const barHeight = (percentage / 100) * 140; // max height 140
                const y = 170 - barHeight;
                const x = 60 + index * 80;
                
                const rawSource = source.source || '';
                const localizedSource = t('adminAnalytics.trafficSources.' + rawSource, { defaultValue: rawSource });
                
                return (
                  <g key={source.source}>
                    <rect x={x} y={y} width="30" height={barHeight} fill={index === 0 ? "#d4ff3f" : "rgba(255,255,255,0.5)"} rx="3" />
                    <text x={x + 15} y={y - 6} textAnchor="middle" fill={index === 0 ? "#d4ff3f" : "#fff"} className="text-[9px] font-mono">{formatNumber(Math.round(percentage))}%</text>
                    <text x={x + 15} y="185" textAnchor="middle" fill="#999" className="text-[7px] font-label-caps">{localizedSource.toUpperCase()}</text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

      </section>

      {/* KPI details table */}
      <section className="luxury-glass p-6 md:p-8 rounded-xl border border-white/5 space-y-lg text-start">
        <h3 className="font-headline-lg text-lg text-white uppercase border-b border-white/5 pb-sm">{t('adminAnalytics.operationalKpis')}</h3>
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 font-label-caps text-[9px] text-on-surface-variant/50">
                <th className="py-3">{t('adminAnalytics.table.metricKey')}</th>
                <th className="py-3">{t('adminAnalytics.table.current')}</th>
                <th className="py-3">{t('adminAnalytics.table.target')}</th>
                <th className="py-3">{t('adminAnalytics.table.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans normal-case text-xs text-on-surface-variant">
              <tr>
                <td className="py-4 text-white font-medium uppercase font-label-caps text-[10px]">{t('adminAnalytics.revPerSession')}</td>
                <td className="py-4 font-mono font-bold">{formatPrice(6.31)}</td>
                <td className="py-4 font-mono">{formatPrice(7.00)}</td>
                <td className="py-4 text-tertiary">{t('adminAnalytics.growing', { percent: formatNumber(4.2) })}</td>
              </tr>
              <tr>
                <td className="py-4 text-white font-medium uppercase font-label-caps text-[10px]">{t('adminAnalytics.cac')}</td>
                <td className="py-4 font-mono font-bold">{formatPrice(24.50)}</td>
                <td className="py-4 font-mono">{formatPrice(20.00)}</td>
                <td className="py-4 text-green-500">{t('adminAnalytics.decreasing', { percent: formatNumber(8.1) })}</td>
              </tr>
              <tr>
                <td className="py-4 text-white font-medium uppercase font-label-caps text-[10px]">{t('adminAnalytics.ltv')}</td>
                <td className="py-4 font-mono font-bold">{formatPrice(540.00)}</td>
                <td className="py-4 font-mono">{formatPrice(600.00)}</td>
                <td className="py-4 text-tertiary">{t('adminAnalytics.growing', { percent: formatNumber(12.4) })}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
