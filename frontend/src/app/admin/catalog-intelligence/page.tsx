'use client';

import React, { useState } from 'react';
import { 
  Loader2, 
  Sparkles, 
  Cpu, 
  Search, 
  RefreshCw, 
  Play, 
  CheckCircle, 
  Tag, 
  Activity, 
  BarChart, 
  AlertCircle, 
  HelpCircle 
} from 'lucide-react';
import { 
  useAiCatalogStatusQuery, 
  useTriggerBulkEnrichmentMutation, 
  useTriggerSingleEnrichmentMutation, 
  useSemanticSearchQuery 
} from '../../../hooks/useAdmin';
import { useProductsQuery } from '../../../hooks/useProducts';
import { useTranslation } from '../../../providers/I18nProvider';

export default function AdminCatalogIntelligencePage() {
  const { t } = useTranslation();
  const { data: status, isLoading: isLoadingStatus, refetch: refetchStatus } = useAiCatalogStatusQuery();
  const { data: products = [], isLoading: isLoadingProducts } = useProductsQuery({ includeDeleted: true });
  const bulkEnrich = useTriggerBulkEnrichmentMutation();
  const singleEnrich = useTriggerSingleEnrichmentMutation();

  const [searchQuery, setSearchQuery] = useState('');
  const [activePlaygroundQuery, setActivePlaygroundQuery] = useState('');
  const [testingPlayground, setTestingPlayground] = useState(false);

  const { data: searchResults = [], isFetching: isSearching } = useSemanticSearchQuery(
    activePlaygroundQuery,
    !!activePlaygroundQuery
  );

  const handleBulkEnrich = async () => {
    try {
      await bulkEnrich.mutateAsync();
    } catch (e) {
      // Handled by mutation toast
    }
  };

  const handleSingleEnrich = async (id: string) => {
    try {
      await singleEnrich.mutateAsync(id);
    } catch (e) {
      // Handled by mutation toast
    }
  };

  const handlePlaygroundSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setTestingPlayground(true);
      setActivePlaygroundQuery(searchQuery);
    }
  };

  if (isLoadingStatus || isLoadingProducts) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-md">
        <div className="w-8 h-8 border-2 border-white/10 border-t-tertiary rounded-full animate-spin"></div>
        <p className="text-on-surface-variant font-label-caps text-xs">{t('adminCatalogIntelligence.collectingMetrics')}</p>
      </div>
    );
  }

  const syncPercent = status?.percent || 0;

  return (
    <div className="space-y-xl text-start">
      
      {/* Header */}
      <div className="border-b border-white/5 pb-lg flex flex-col md:flex-row justify-between items-start md:items-end gap-md">
        <div>
          <h1 className="font-display-lg text-3xl md:text-5xl text-white uppercase tracking-tight flex items-center gap-xs">
            <Sparkles className="h-8 w-8 text-tertiary animate-pulse" /> {t('adminCatalogIntelligence.title')}
          </h1>
          <p className="text-on-surface-variant text-sm font-sans normal-case mt-sm max-w-2xl">
            {t('adminCatalogIntelligence.desc')}
          </p>
        </div>
        <button
          onClick={() => refetchStatus()}
          className="px-4 py-2 border border-white/10 text-white font-button text-[10px] uppercase rounded hover:bg-white/[0.02] flex items-center gap-xs"
        >
          <RefreshCw className="h-3 w-3" /> {t('adminCatalogIntelligence.refreshTelemetry')}
        </button>
      </div>

      {/* Telemetry Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
        
        {/* Sync Progress Map (Left: 8 cols) */}
        <div className="lg:col-span-8 space-y-lg">
          <section className="luxury-glass p-6 md:p-8 rounded-xl border border-white/5 space-y-lg relative overflow-hidden">
            <div className="flex justify-between items-start relative z-10">
              <div>
                <span className="font-label-caps text-[9px] text-tertiary tracking-widest uppercase">{t('adminCatalogIntelligence.pipelineStatus')}</span>
                <h3 className="font-headline-lg text-2xl text-white uppercase mt-xs">{t('adminCatalogIntelligence.enrichmentScore')}</h3>
              </div>
              <div className="text-end">
                <span className="text-3xl md:text-4xl font-display-lg text-tertiary">{syncPercent}%</span>
                <p className="text-[10px] text-on-surface-variant font-mono mt-xs">
                  {t('adminCatalogIntelligence.enrichedCount', { count: status?.enrichedCount || 0, total: status?.totalProducts || 0 })}
                </p>
              </div>
            </div>

            {/* Custom Progress Bar */}
            <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden relative z-10 border border-white/5">
              <div 
                className="h-full bg-gradient-to-r from-tertiary via-[#e2ff6e] to-white transition-all duration-1000 ease-out"
                style={{ width: `${syncPercent}%` }}
              ></div>
            </div>

            {/* Bullet Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-md font-sans text-xs pt-4 relative z-10 border-t border-white/5">
              <div className="space-y-xs">
                <span className="text-on-surface-variant/50 uppercase text-[9px]">{t('adminCatalogIntelligence.enrichmentMethod')}</span>
                <p className="text-white font-semibold flex items-center gap-xs">
                  <Cpu className="h-3.5 w-3.5 text-tertiary" /> Groq Speculative Dec
                </p>
              </div>
              <div className="space-y-xs">
                <span className="text-on-surface-variant/50 uppercase text-[9px]">{t('adminCatalogIntelligence.compatibilityLinks')}</span>
                <p className="text-white font-semibold">Active Cross-Outfits</p>
              </div>
              <div className="space-y-xs">
                <span className="text-on-surface-variant/50 uppercase text-[9px]">{t('adminCatalogIntelligence.backgroundWorkers')}</span>
                <p className="text-white font-semibold flex items-center gap-xs">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span> BullMQ Redis Thread
                </p>
              </div>
            </div>

            {/* Decorative background light */}
            <div className="absolute top-0 right-0 rtl:left-0 rtl:right-auto w-64 h-64 bg-tertiary/5 rounded-full blur-3xl -mr-16 rtl:-ml-16 rtl:-mr-0 -mt-16 pointer-events-none"></div>
          </section>

          {/* Action Trigger */}
          <section className="luxury-glass p-6 md:p-8 rounded-xl border border-white/5 space-y-md">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-md">
              <div className="space-y-xs max-w-lg">
                <h4 className="text-white font-bold text-sm uppercase">{t('adminCatalogIntelligence.reindexHeuristics')}</h4>
                <p className="text-on-surface-variant font-sans text-xs normal-case leading-relaxed">
                  {t('adminCatalogIntelligence.bulkSyncDesc')}
                </p>
              </div>
              <button
                onClick={handleBulkEnrich}
                disabled={bulkEnrich.isPending}
                className="w-full sm:w-auto px-6 py-4 bg-tertiary text-black font-button text-xs uppercase tracking-wider rounded hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-xs shrink-0"
              >
                {bulkEnrich.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('adminCatalogIntelligence.enqueuingJobs')}
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-black" />
                    {t('adminCatalogIntelligence.runBulkEnrichment')}
                  </>
                )}
              </button>
            </div>
          </section>
        </div>

        {/* Aesthetics Distribution (Right: 4 cols) */}
        <div className="lg:col-span-4">
          <section className="luxury-glass p-6 rounded-xl border border-white/5 flex flex-col h-full justify-between space-y-lg">
            <h3 className="font-headline-lg text-sm text-white uppercase border-b border-white/5 pb-2 flex items-center gap-xs">
              <BarChart className="w-4 h-4 text-tertiary" /> {t('adminCatalogIntelligence.aestheticDistribution')}
            </h3>

            <div className="space-y-md flex-1 overflow-y-auto max-h-56 pr-1 no-scrollbar pt-2">
              {status?.aesthetics && Object.entries(status.aesthetics).map(([aesthetic, count]) => {
                const total = Object.values(status.aesthetics).reduce((a, b) => a + b, 0);
                const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={aesthetic} className="space-y-xs text-xs font-sans text-start">
                    <div className="flex justify-between text-white font-semibold">
                      <span className="truncate pr-xs rtl:pl-xs rtl:pr-0">{aesthetic}</span>
                      <span className="text-on-surface-variant/60 text-[10px] font-mono">{count} ({percent}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-white/20" style={{ width: `${percent}%` }}></div>
                    </div>
                  </div>
                );
              })}
              {(!status?.aesthetics || Object.keys(status.aesthetics).length === 0) && (
                <div className="py-10 text-center text-on-surface-variant/40 font-mono text-[10px]">
                  {t('adminCatalogIntelligence.noDataIndexed')}
                </div>
              )}
            </div>
          </section>
        </div>

      </div>

      {/* Semantic Intent Playground */}
      <section className="luxury-glass p-6 md:p-8 rounded-xl border border-white/5 space-y-lg">
        <div>
          <h3 className="font-headline-lg text-lg text-white uppercase flex items-center gap-xs">
            <Search className="w-5 h-5 text-tertiary" /> {t('adminCatalogIntelligence.playgroundTitle')}
          </h3>
          <p className="text-[11px] text-on-surface-variant/50 font-sans normal-case mt-0.5">
            {t('adminCatalogIntelligence.playgroundDesc')}
          </p>
        </div>

        <form onSubmit={handlePlaygroundSearch} className="flex gap-sm">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('adminCatalogIntelligence.playgroundPlaceholder')}
            className="flex-1 bg-white/[0.02] border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-on-surface-variant/30 focus:outline-none focus:border-tertiary transition-colors"
          />
          <button
            type="submit"
            disabled={isSearching}
            className="px-6 py-3 bg-white text-black hover:bg-tertiary hover:text-black font-button text-xs uppercase rounded transition-colors flex items-center gap-xs"
          >
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : t('adminCatalogIntelligence.runQuery')}
          </button>
        </form>

        {testingPlayground && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg pt-2 font-sans text-start">
            
            {/* Matches list */}
            <div className="lg:col-span-12 space-y-md">
              <h4 className="text-white font-bold text-xs uppercase flex items-center gap-xs">
                <Activity className="h-4 w-4 text-tertiary animate-pulse" /> {t('adminCatalogIntelligence.semanticResults')}
              </h4>

              <div className="space-y-sm max-h-[300px] overflow-y-auto no-scrollbar">
                {searchResults.map((item: any) => (
                  <div key={item.id} className="p-4 bg-white/[0.01] border border-white/5 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-sm">
                    <div className="space-y-xs">
                      <div className="flex items-center gap-sm flex-wrap">
                        <span className="text-white font-bold uppercase text-xs">{item.name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-on-surface-variant">
                          {t('aiStylist.score')}: {item.score}%
                        </span>
                      </div>
                      <p className="text-on-surface-variant text-[11px] leading-relaxed max-w-2xl">
                        <span className="text-tertiary font-bold">{t('adminCatalogIntelligence.aiExplanation')}:</span> {item.relevanceExplanation}
                      </p>
                    </div>
                  </div>
                ))}

                {searchResults.length === 0 && !isSearching && (
                  <div className="py-10 text-center text-on-surface-variant/40 font-mono text-[10px]">
                    {t('adminCatalogIntelligence.noResults')}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </section>

      {/* Catalog Aesthetics Grid */}
      <section className="luxury-glass p-6 md:p-8 rounded-xl border border-white/5 space-y-lg">
        <h3 className="font-headline-lg text-lg text-white uppercase border-b border-white/5 pb-sm">{t('adminCatalogIntelligence.registryTitle')}</h3>

        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-start border-collapse">
            <thead>
              <tr className="border-b border-white/5 font-label-caps text-[9px] text-on-surface-variant/50">
                <th className="py-3 pr-2 rtl:pl-2 rtl:pr-0 text-start">{t('adminCatalogIntelligence.productName')}</th>
                <th className="py-3 px-2 text-start">{t('adminCatalogIntelligence.styleAesthetic')}</th>
                <th className="py-3 px-2 text-start">{t('adminCatalogIntelligence.useRatio')}</th>
                <th className="py-3 px-2 text-start">{t('adminCatalogIntelligence.fitDesign')}</th>
                <th className="py-3 px-2 text-start">{t('adminCatalogIntelligence.aiTags')}</th>
                <th className="py-3 text-end">{t('adminCatalogIntelligence.action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans normal-case text-xs text-on-surface-variant">
              {products.map((product: any) => {
                const enriched = product.aiMetadata;
                return (
                  <tr key={product.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="py-4 pr-2 rtl:pl-2 rtl:pr-0 text-white font-bold text-start">{product.name}</td>
                    <td className="py-4 px-2 text-start">
                      {enriched?.styleAesthetic ? (
                        <span className="text-white font-medium">{enriched.styleAesthetic}</span>
                      ) : (
                        <span className="text-on-surface-variant/30 font-mono text-[10px]">{t('adminCatalogIntelligence.unclassified')}</span>
                      )}
                    </td>
                    <td className="py-4 px-2 font-mono text-[10px] text-start">
                      {enriched?.gymStreetwearUsage || '-'}
                    </td>
                    <td className="py-4 px-2 text-white font-medium text-start">
                      {enriched?.fitType || '-'}
                    </td>
                    <td className="py-4 px-2 text-start">
                      <div className="flex flex-wrap gap-xs">
                        {enriched?.aiTags ? enriched.aiTags.split(',').map((tag: string) => (
                          <span key={tag} className="text-[9px] font-label-caps px-2 py-0.5 rounded-full border border-white/10 bg-white/[0.02] text-on-surface-variant">
                            {tag}
                          </span>
                        )) : '-'}
                      </div>
                    </td>
                    <td className="py-4 text-end">
                      <button
                        onClick={() => handleSingleEnrich(product.id)}
                        disabled={singleEnrich.isPending}
                        className="px-3.5 py-1.5 border border-white/10 text-white font-button text-[10px] uppercase rounded hover:border-tertiary hover:text-tertiary transition-colors disabled:opacity-50"
                      >
                        {singleEnrich.isPending ? t('adminCatalogIntelligence.syncing') : t('adminCatalogIntelligence.syncAi')}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
