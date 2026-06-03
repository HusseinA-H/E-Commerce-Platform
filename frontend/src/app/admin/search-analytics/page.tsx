'use client';

import React from 'react';
import {
  Search,
  TrendingUp,
  AlertCircle,
  MousePointerClick,
  ShoppingCart,
  Zap,
  BarChart3,
  Clock,
  RefreshCw,
  Eye,
  Layers,
} from 'lucide-react';
import { useSearchAnalytics, useRebuildSearchIndex } from '../../../hooks/useSearch';
import { useTranslation } from '../../../providers/I18nProvider';

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = false,
  color = 'tertiary',
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: boolean;
  color?: 'tertiary' | 'blue' | 'green' | 'red' | 'purple';
}) {
  const colorMap: Record<string, string> = {
    tertiary: 'text-tertiary border-tertiary/20 bg-tertiary/5',
    blue: 'text-blue-400 border-blue-400/20 bg-blue-400/5',
    green: 'text-green-400 border-green-400/20 bg-green-400/5',
    red: 'text-red-400 border-red-400/20 bg-red-400/5',
    purple: 'text-purple-400 border-purple-400/20 bg-purple-400/5',
  };

  return (
    <div className={`p-5 rounded-xl border ${colorMap[color]} backdrop-blur-sm`}>
      <div className="flex items-start justify-between mb-3">
        <Icon className={`h-5 w-5 opacity-70`} />
        <span className="text-[9px] font-mono opacity-40 tracking-widest uppercase">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white font-mono">{value}</div>
      {sub && <p className="text-[11px] opacity-50 mt-1 font-sans">{sub}</p>}
    </div>
  );
}

export default function SearchAnalyticsPage() {
  const { locale, t } = useTranslation();
  const { data, isFetching, refetch } = useSearchAnalytics();
  const rebuild = useRebuildSearchIndex();

  const analytics = data as any;

  return (
    <div className="p-6 md:p-8 space-y-8 min-h-screen text-start">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-start">
          <div className="flex items-center gap-3 mb-1">
            <Search className="h-5 w-5 text-tertiary" />
            <h1 className="text-xl font-bold text-white font-display uppercase tracking-widest">
              {t('adminSearch.title')}
            </h1>
            {isFetching && (
              <span className="text-[9px] font-mono text-tertiary/60 bg-tertiary/10 px-2 py-0.5 rounded-full animate-pulse">
                LIVE
              </span>
            )}
          </div>
          <p className="text-sm text-white/40 font-sans">
            {t('adminSearch.desc')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => rebuild.mutate()}
            disabled={rebuild.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 hover:border-white/20 text-white/60 hover:text-white rounded-lg text-xs font-mono transition-all"
          >
            <Layers className={`h-4 w-4 ${rebuild.isPending ? 'animate-spin' : ''}`} />
            {rebuild.isPending ? t('adminSearch.rebuilding') : t('adminSearch.rebuildIndex')}
          </button>
          {rebuild.data && (
            <span className="text-[10px] font-mono text-green-400/60">
              {t('adminSearch.rebuildSuccess', { count: rebuild.data.indexed })}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-tertiary/10 border border-tertiary/20 hover:bg-tertiary/20 text-tertiary rounded-lg text-xs font-mono transition-all"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t('admin.refresh')}
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard
          label={t('adminSearch.totalSearches')}
          value={(analytics?.totalSearches || 0).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')}
          sub={t('adminSearch.last30Days')}
          icon={Search}
          color="tertiary"
        />
        <KpiCard
          label={t('adminSearch.uniqueQueries')}
          value={(analytics?.uniqueQueries || 0).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')}
          sub={t('adminSearch.distinctIntents')}
          icon={Layers}
          color="blue"
        />
        <KpiCard
          label={t('adminSearch.avgResults')}
          value={(analytics?.avgResultCount || 0).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')}
          sub={t('adminSearch.perSearch')}
          icon={BarChart3}
          color="green"
        />
        <KpiCard
          label={t('adminSearch.avgLatency')}
          value={`${analytics?.avgLatencyMs || 0}ms`}
          sub={t('adminSearch.retrievalSpeed')}
          icon={Clock}
          color="purple"
        />
        <KpiCard
          label={t('adminSearch.clickThrough')}
          value={`${analytics?.clickThroughRate || 0}%`}
          sub={t('adminSearch.searchClick')}
          icon={MousePointerClick}
          color="tertiary"
        />
        <KpiCard
          label={t('adminSearch.conversion')}
          value={`${analytics?.conversionRate || 0}%`}
          sub={t('adminSearch.searchPurchase')}
          icon={ShoppingCart}
          color="green"
        />
      </div>

      {/* Zero Result Alert */}
      {analytics?.zeroResultRate > 20 && (
        <div className="flex items-start gap-3 p-4 bg-red-500/8 border border-red-500/20 rounded-xl text-start">
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <div className="text-start">
            <p className="text-sm font-semibold text-red-400">
              {t('adminSearch.zeroResultAlert', { rate: analytics.zeroResultRate })}
            </p>
            <p className="text-xs text-white/40 mt-0.5">
              {t('adminSearch.zeroResultDesc')}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-start">
        {/* Top Queries */}
        <div className="lg:col-span-2 bg-white/2 border border-white/8 rounded-xl overflow-hidden text-start">
          <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2 text-start">
            <TrendingUp className="h-4 w-4 text-tertiary" />
            <h2 className="text-xs font-mono text-white/60 tracking-widest uppercase">
              {t('adminSearch.topQueries')}
            </h2>
          </div>
          <div className="divide-y divide-white/5 text-start">
            {(analytics?.topQueries || []).length > 0 ? (
              (analytics.topQueries as any[]).map((q: any, i: number) => (
                <div key={i} className="px-5 py-3 flex items-center gap-4">
                  <span className="text-[10px] font-mono text-white/20 w-5 text-end">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0 text-start">
                    <p className="text-sm text-white/80 font-mono truncate">{q.query}</p>
                    <p className="text-[10px] text-white/30 mt-0.5">
                      {t('adminSearch.resultsCount', { count: q.avgResultCount })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-tertiary/60 rounded-full"
                        style={{
                          width: `${Math.min(
                            100,
                            (q.count / (analytics.topQueries[0]?.count || 1)) * 100,
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-white/40 w-8 text-end">
                      {q.count}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-5 py-8 text-center text-white/20 text-sm font-sans">
                {t('adminSearch.noSearchData')}
              </div>
            )}
          </div>
        </div>

        {/* Zero Result Queries */}
        <div className="bg-white/2 border border-white/8 rounded-xl overflow-hidden text-start">
          <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-400/60" />
            <h2 className="text-xs font-mono text-white/60 tracking-widest uppercase">
              {t('adminSearch.discoveryGaps')}
            </h2>
            <span className="ms-auto text-[9px] font-mono text-white/20">
              {t('adminSearch.zeroRateLabel', { rate: analytics?.zeroResultRate || 0 })}
            </span>
          </div>
          <div className="divide-y divide-white/5">
            {(analytics?.zeroResultQueries || []).length > 0 ? (
              (analytics.zeroResultQueries as any[]).map((q: any, i: number) => (
                <div key={i} className="px-5 py-3 flex items-center gap-3 text-start">
                  <span className="w-2 h-2 rounded-full bg-red-400/30 shrink-0" />
                  <p className="text-sm text-white/60 font-mono truncate flex-1 text-start">{q.query}</p>
                  <span className="text-[10px] font-mono text-red-400/40 shrink-0 text-end">
                    {q.count}×
                  </span>
                </div>
              ))
            ) : (
              <div className="px-5 py-8 text-center text-white/20 text-sm font-sans">
                {t('adminSearch.noGaps')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Source Breakdown + Recent Searches */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-start">
        {/* Source Breakdown */}
        <div className="bg-white/2 border border-white/8 rounded-xl overflow-hidden text-start">
          <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
            <Eye className="h-4 w-4 text-blue-400/60" />
            <h2 className="text-xs font-mono text-white/60 tracking-widest uppercase">
              {t('adminSearch.sourceMix')}
            </h2>
          </div>
          <div className="p-5 space-y-3">
            {Object.entries(analytics?.sourceBreakdown || {}).map(([source, count]) => {
              const total = analytics?.totalSearches || 1;
              const pct = Math.round(((count as number) / total) * 100);
              const colorMap: Record<string, string> = {
                semantic: 'bg-tertiary',
                personalized: 'bg-blue-400',
                visual: 'bg-purple-400',
                trending: 'bg-green-400',
                autocomplete: 'bg-yellow-400',
              };
              return (
                <div key={source} className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-start">
                    <span className="text-white/50 uppercase tracking-wider text-start">{source}</span>
                    <span className="text-white/30 text-end">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${colorMap[source] || 'bg-white/20'} rounded-full transition-all duration-700`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {!Object.keys(analytics?.sourceBreakdown || {}).length && (
              <p className="text-white/20 text-sm text-center py-4 font-sans">{t('adminSearch.noSourceMix')}</p>
            )}
          </div>
        </div>

        {/* Recent Searches */}
        <div className="lg:col-span-2 bg-white/2 border border-white/8 rounded-xl overflow-hidden text-start">
          <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2 text-start">
            <Clock className="h-4 w-4 text-white/30" />
            <h2 className="text-xs font-mono text-white/60 tracking-widest uppercase">
              {t('adminSearch.recentSearches')}
            </h2>
          </div>
          <div className="divide-y divide-white/5 text-start">
            {(analytics?.recentSearches || []).slice(0, 10).map((s: any, i: number) => (
              <div key={i} className="px-5 py-3 flex items-center gap-4 text-start">
                <div className="flex-1 min-w-0 text-start">
                  <p className="text-sm text-white/70 font-mono truncate">{s.query}</p>
                </div>
                <span className="text-[9px] font-mono text-white/25 bg-white/5 px-2 py-0.5 rounded">
                  {s.source}
                </span>
                <span className="text-[10px] font-mono text-white/30 w-8 text-end shrink-0">
                  {t('adminSearch.resultsLabel', { count: s.resultCount })}
                </span>
                <span className="text-[9px] text-white/20 font-mono shrink-0 text-end">
                  {new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            {!analytics?.recentSearches?.length && (
              <div className="px-5 py-8 text-center text-white/20 text-sm font-sans">
                {t('adminSearch.noRecent')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Latency benchmark */}
      <div className="p-5 bg-white/2 border border-white/8 rounded-xl text-start">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-4 w-4 text-tertiary" />
          <h2 className="text-xs font-mono text-white/60 tracking-widest uppercase">
            {t('adminSearch.performanceBenchmark')}
          </h2>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {[
            { label: t('adminSearch.avgLatency'), value: `${analytics?.avgLatencyMs || 0}ms`, status: (analytics?.avgLatencyMs || 0) < 500 ? 'good' : 'warn' },
            { label: t('adminSearch.p99Target'), value: '<1000ms', status: 'info' },
            { label: t('adminSearch.cacheHit'), value: `${analytics?.fromCacheRate || 0}%`, status: 'info' },
            { label: t('adminSearch.avgScore'), value: '—', status: 'info' },
            { label: t('adminSearch.vectorIndex'), value: 'In-Memory', status: 'info' },
            { label: t('adminSearch.vectorProvider'), value: 'TextHash-128d', status: 'info' },
          ].map((item, i) => (
            <div key={i} className="text-center space-y-1">
              <div className={`text-sm font-mono font-bold ${
                item.status === 'good' ? 'text-green-400' :
                item.status === 'warn' ? 'text-yellow-400' :
                'text-white/50'
              }`}>
                {item.value}
              </div>
              <div className="text-[9px] font-mono text-white/25 uppercase tracking-wider">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
