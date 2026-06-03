'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  X,
  Info,
  SearchX,
  Loader2,
  Image as ImageIcon,
  TrendingUp,
  Zap,
  User,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { useUIStore } from '../store';
import { SafeImage } from './SafeImage';
import { useCurrency } from '../providers/CurrencyProvider';
import { useTranslation } from '../providers/I18nProvider';
import {
  useSemanticSearch,
  useAutocomplete,
  useVisualSearch,
  useTrendingProducts,
  useTrackSearchClick,
} from '../hooks/useSearch';

type SearchTab = 'semantic' | 'visual' | 'trending';

export default function AISearch() {
  const router = useRouter();
  const isOpen = useUIStore((state) => state.isAISearchOpen);
  const closeAISearch = useUIStore((state) => state.closeAISearch);
  const { t, locale } = useTranslation();

  const [tab, setTab] = useState<SearchTab>('semantic');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // ─── Data hooks ──────────────────────────────────────────────────────────
  const searchQuery = useSemanticSearch(debouncedQuery, tab === 'semantic');
  const autocompleteQuery = useAutocomplete(query, tab === 'semantic' && query.length >= 2 && !debouncedQuery);
  const visualSearch = useVisualSearch();
  const trending = useTrendingProducts(12);
  const trackClick = useTrackSearchClick();

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      // Reset on close
      setQuery('');
      setDebouncedQuery('');
      setImageUrl('');
      setTab('semantic');
      setShowAutocomplete(false);
    }
  }, [isOpen]);

  // Debounce semantic query (400ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
      if (query.trim().length >= 2) setShowAutocomplete(false);
    }, 400);
    return () => clearTimeout(handler);
  }, [query]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    setImageUrl('');
    setTab('semantic');
    closeAISearch();
  }, [closeAISearch]);

  const handleProductClick = (product: any) => {
    if (debouncedQuery) {
      trackClick.mutate({ query: debouncedQuery, type: 'click' });
    }
    handleClose();
    router.push(`/product/${product.slug || product.id}`);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowAutocomplete(false);
  };

  const handleVisualSearch = () => {
    if (imageUrl.trim()) {
      visualSearch.mutate({ imageUrl: imageUrl.trim() });
    }
  };

  if (!isOpen) return null;

  const results = searchQuery.data?.results || [];
  const isSearching = searchQuery.isFetching;
  const aiNarrative = searchQuery.data?.aiNarrative;
  const isPersonalized = results.some((r) => r.personalized);
  const suggestions = autocompleteQuery.data?.suggestions || [];
  const trendingProducts = trending.data || [];
  const visualResults = visualSearch.data?.products || [];

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-2xl flex flex-col items-center justify-start overflow-y-auto">
      {/* Ambient gradient overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-tertiary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-5xl px-4 md:px-8 pt-16 pb-16">
        {/* ── Close Button ──────────────────────────────────────────────── */}
        <button
          onClick={handleClose}
          id="ai-search-close"
          className="absolute top-4 right-4 md:right-0 w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center hover:border-tertiary/50 transition-colors group z-10"
        >
          <X className="text-foreground/50 group-hover:text-foreground h-4 w-4 transition-colors" />
        </button>

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-8">
          <div className="relative">
            <Sparkles className={`h-5 w-5 text-tertiary ${isSearching ? 'animate-pulse' : ''}`} />
            {isSearching && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-tertiary rounded-full animate-ping" />
            )}
          </div>
          <span className="font-mono text-[10px] tracking-[0.3em] text-tertiary/80 uppercase">
            {isSearching
              ? t('aiSearch.pipelineActive')
              : isPersonalized
              ? t('aiSearch.personalizedResults')
              : t('aiSearch.searchEngine')}
          </span>
        </div>

        {/* ── Tab Switcher ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 mb-8 border-b border-outline-variant/30 pb-0">
          {([
            { key: 'semantic', label: t('aiSearch.tabSemantic'), icon: Sparkles },
            { key: 'visual', label: t('aiSearch.tabVisual'), icon: Eye },
            { key: 'trending', label: t('aiSearch.tabTrending'), icon: TrendingUp },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              id={`ai-search-tab-${key}`}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-[10px] font-mono tracking-widest uppercase border-b-2 transition-all -mb-px ${
                tab === key
                  ? 'text-tertiary border-tertiary'
                  : 'text-foreground/45 border-transparent hover:text-foreground/80'
              }`}
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* SEMANTIC SEARCH TAB                                               */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {tab === 'semantic' && (
          <div className="space-y-6">
            {/* Search Input */}
            <div className="relative">
              <div className="border-b-2 border-outline-variant focus-within:border-tertiary/60 transition-all duration-300 py-4">
                <input
                  ref={inputRef}
                  id="ai-search-input"
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setShowAutocomplete(e.target.value.length >= 2);
                  }}
                  onFocus={() => query.length >= 2 && setShowAutocomplete(true)}
                  placeholder={t('aiSearch.inputPlaceholder')}
                  className="w-full bg-transparent border-none focus:outline-none text-foreground font-display text-2xl md:text-4xl placeholder-foreground/20 tracking-tight"
                />
                {query && (
                  <button
                    onClick={() => { setQuery(''); setDebouncedQuery(''); setShowAutocomplete(false); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Autocomplete dropdown */}
              {showAutocomplete && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-outline-variant rounded-lg overflow-hidden z-20 shadow-2xl">
                  {suggestions.map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-foreground/5 transition-colors group"
                    >
                      <ChevronRight className="h-3 w-3 text-tertiary/50 group-hover:text-tertiary transition-colors shrink-0" />
                      <span className="text-sm text-on-surface-variant group-hover:text-foreground transition-colors font-mono">
                        {suggestion}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Suggestion chips (when input is empty) */}
            {!query && (
              <div className="space-y-3">
                <p className="text-[10px] font-mono text-on-surface-variant/40 tracking-[0.25em] uppercase">
                  {t('aiSearch.examplesTitle')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    t('aiSearch.examples.hoodie'),
                    t('aiSearch.examples.running'),
                    t('aiSearch.examples.monochrome'),
                    t('aiSearch.examples.streetwear'),
                    t('aiSearch.examples.marathon'),
                    t('aiSearch.examples.shoes'),
                    t('aiSearch.examples.compression'),
                    t('aiSearch.examples.waterproof'),
                  ].map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestionClick(s)}
                      className="px-3 py-1.5 text-[11px] font-mono border border-outline-variant hover:border-tertiary/40 hover:text-tertiary text-on-surface-variant/60 rounded-full transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading state */}
            {isSearching && (
              <div className="flex items-center gap-3 text-on-surface-variant/50 py-4">
                <Loader2 className="h-4 w-4 animate-spin text-tertiary" />
                <div className="space-y-1">
                  <p className="text-xs font-mono text-on-surface-variant/70">
                    {t('aiSearch.runningPipeline')}
                  </p>
                  <div className="flex gap-1">
                    {[
                      { key: 'intent', label: t('aiSearch.stages.intent') },
                      { key: 'embed', label: t('aiSearch.stages.embed') },
                      { key: 'vector', label: t('aiSearch.stages.vector') },
                      { key: 'score', label: t('aiSearch.stages.score') },
                      { key: 'rank', label: t('aiSearch.stages.rank') },
                      { key: 'personalize', label: t('aiSearch.stages.personalize') },
                      { key: 'narrative', label: t('aiSearch.stages.narrative') }
                    ].map((stage, i) => (
                      <span key={i} className="text-[9px] font-mono text-tertiary/40 bg-tertiary/5 px-1.5 py-0.5 rounded">
                        {stage.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* AI Narrative Banner */}
            {aiNarrative && !isSearching && results.length > 0 && (
              <div className="flex items-start gap-3 p-4 bg-tertiary/5 border border-tertiary/15 rounded-xl">
                <Sparkles className="text-tertiary shrink-0 h-4 w-4 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-mono text-tertiary/60 tracking-widest uppercase mb-1">
                    {t('aiSearch.narrativeTitle')}
                    {isPersonalized && (
                      <span className="ml-2 inline-flex items-center gap-1 text-blue-400/60">
                        <User className="h-2.5 w-2.5" />
                        {t('aiSearch.personalized')}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-on-surface-variant/90 leading-relaxed font-sans">
                    {aiNarrative}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="text-[9px] font-mono text-on-surface-variant/40">
                    {searchQuery.data?.latencyMs}ms
                  </span>
                  {searchQuery.data?.fromCache && (
                    <div className="flex items-center gap-1 text-[9px] font-mono text-green-400/40">
                      <Zap className="h-2.5 w-2.5" />
                      {t('aiSearch.cached')}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Results */}
            {debouncedQuery && !isSearching && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
                  <p className="text-[10px] font-mono text-on-surface-variant/40 tracking-widest uppercase">
                    {t('aiSearch.productsRetrieved').replace('{count}', results.length.toString())}
                  </p>
                  {searchQuery.data?.intent && (
                    <div className="flex items-center gap-1 flex-wrap justify-end">
                      {[
                        ...(searchQuery.data.intent.categories || []),
                        ...(searchQuery.data.intent.styles || []),
                        ...(searchQuery.data.intent.useCases || []).slice(0, 2),
                      ].slice(0, 4).map((tag: string, i: number) => (
                        <span key={i} className="text-[9px] font-mono text-tertiary/50 bg-tertiary/5 px-2 py-0.5 rounded-full border border-tertiary/10">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {results.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {results.map((product, idx) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onClick={() => handleProductClick(product)}
                        animationDelay={idx * 50}
                        showScore
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                    <SearchX className="h-12 w-12 text-foreground/10" />
                    <p className="text-on-surface-variant/60 text-sm font-sans">
                      {t('aiSearch.noProductsMatch').replace('{query}', debouncedQuery)}
                    </p>
                    <p className="text-on-surface-variant/40 text-xs">{t('aiSearch.noProductsDesc')}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* VISUAL SEARCH TAB                                                 */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {tab === 'visual' && (
          <div className="space-y-6">
            <div>
              <p className="text-on-surface-variant/70 text-sm font-sans mb-4 leading-relaxed">
                {t('aiSearch.visualDesc')}
              </p>

              <div className="flex gap-3">
                <input
                  ref={imageInputRef}
                  id="ai-visual-search-input"
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder={t('aiSearch.visualPlaceholder')}
                  className="flex-1 bg-surface-low border border-outline-variant focus:border-tertiary/40 rounded-lg px-4 py-3 text-foreground text-sm font-mono focus:outline-none transition-colors placeholder-on-surface-variant/30"
                />
                <button
                  id="ai-visual-search-btn"
                  onClick={handleVisualSearch}
                  disabled={!imageUrl.trim() || visualSearch.isPending}
                  className="px-6 py-3 bg-tertiary text-on-tertiary font-mono text-sm tracking-wide rounded-lg hover:bg-tertiary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  {visualSearch.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImageIcon className="h-4 w-4" />
                  )}
                  {visualSearch.isPending ? t('aiSearch.visualBtnAnalyzing') : t('aiSearch.visualBtnSearch')}
                </button>
              </div>
            </div>

            {/* Visual search results */}
            {visualSearch.data && (
              <div className="space-y-4">
                {/* Extracted attributes */}
                <div className="p-4 bg-surface-low border border-outline-variant/50 rounded-xl space-y-2">
                  <p className="text-[10px] font-mono text-on-surface-variant/40 tracking-widest uppercase">
                    {t('aiSearch.visualExtractionTitle')}
                  </p>
                  <p className="text-sm text-on-surface-variant/85">{visualSearch.data.visualDescription}</p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {[
                      visualSearch.data.extractedAttributes.garmentType,
                      visualSearch.data.extractedAttributes.fit,
                      ...visualSearch.data.extractedAttributes.colors,
                      visualSearch.data.extractedAttributes.style,
                    ].map((attr, i) => (
                      <span key={i} className="text-[9px] font-mono bg-tertiary/10 text-tertiary/60 px-2 py-0.5 rounded-full border border-tertiary/15">
                        {attr}
                      </span>
                    ))}
                  </div>
                </div>

                <p className="text-[10px] font-mono text-on-surface-variant/40 tracking-widest uppercase">
                  {t('aiSearch.visualSimilarTitle').replace('{count}', visualResults.length.toString())}
                </p>

                {visualResults.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {visualResults.map((product: any, idx: number) => (
                      <ProductCard
                        key={product.id}
                        product={{
                          ...product,
                          score: product.visualSimilarityScore,
                          relevanceExplanation: product.visualMatchReason,
                        }}
                        onClick={() => handleProductClick(product)}
                        animationDelay={idx * 50}
                        showScore
                        scoreLabel={t('aiSearch.visualMatchLabel')}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                    <SearchX className="h-12 w-12 text-foreground/10" />
                    <p className="text-on-surface-variant/60 text-sm">{t('aiSearch.visualNoProducts')}</p>
                  </div>
                )}
              </div>
            )}

            {visualSearch.isError && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-red-400/80 text-sm">{t('aiSearch.visualFailed')}</p>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* TRENDING TAB                                                      */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {tab === 'trending' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-4 w-4 text-tertiary" />
              <p className="text-on-surface-variant/70 text-sm font-sans">
                {t('aiSearch.trendingTitle')}
              </p>
            </div>

            {trending.isFetching ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : trendingProducts.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {trendingProducts.map((product: any, idx: number) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onClick={() => handleProductClick(product)}
                    animationDelay={idx * 40}
                    badge={idx < 3 ? `#${idx + 1}` : undefined}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <TrendingUp className="h-12 w-12 text-foreground/10" />
                <p className="text-on-surface-variant/60 text-sm">{t('aiSearch.trendingLoading')}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

interface ProductCardProps {
  product: any;
  onClick: () => void;
  animationDelay?: number;
  showScore?: boolean;
  scoreLabel?: string;
  badge?: string;
}

function ProductCard({ product, onClick, animationDelay = 0, showScore, scoreLabel, badge }: ProductCardProps) {
  const primaryImage = product.images?.find((img: any) => img.isPrimary)?.url || product.images?.[0]?.url;
  const { formatPrice, usdToActive } = useCurrency();
  const { t } = useTranslation();
  const activeScoreLabel = scoreLabel || t('aiSearch.relevanceLabel');

  return (
    <div
      onClick={onClick}
      style={{ animationDelay: `${animationDelay}ms` }}
      className="group cursor-pointer space-y-2 animate-fade-in"
    >
      {/* Image */}
      <div className="aspect-[4/5] bg-surface-low overflow-hidden relative border border-outline-variant/30 rounded-sm">
        <SafeImage
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          src={primaryImage}
          alt={product.name}
        />
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.isNew && (
            <span className="bg-tertiary text-on-tertiary font-mono text-[8px] px-2 py-0.5 rounded-sm tracking-widest">
              {t('aiSearch.badgeNew')}
            </span>
          )}
          {badge && (
            <span className="bg-surface/75 backdrop-blur text-foreground font-mono text-[8px] px-2 py-0.5 rounded-sm border border-outline-variant">
              {badge}
            </span>
          )}
          {product.personalized && (
            <span className="bg-blue-500/20 backdrop-blur text-blue-500 font-mono text-[8px] px-2 py-0.5 rounded-sm border border-blue-500/20 flex items-center gap-1">
              <User className="h-2 w-2" />
              {t('aiSearch.badgeForYou')}
            </span>
          )}
        </div>

        {/* Score bar overlay */}
        {showScore && product.score !== undefined && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-outline-variant/30">
            <div
              className="h-full bg-tertiary transition-all duration-1000"
              style={{ width: `${product.score}%` }}
            />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="space-y-1 px-0.5">
        <p className="text-[9px] font-mono text-on-surface-variant/40 tracking-widest uppercase">
          {product.category?.name || product.category}
        </p>
        <h4 className="text-xs font-semibold text-foreground group-hover:text-tertiary transition-colors uppercase tracking-wide leading-tight line-clamp-2">
          {product.name}
        </h4>
        <p className="text-xs text-on-surface-variant font-mono">
          {formatPrice(usdToActive(product.price || 0))}
        </p>

        {/* Relevance score */}
        {showScore && product.score !== undefined && (
          <div className="flex items-center gap-1.5 pt-0.5">
            <div className="flex-1 h-[2px] bg-outline-variant/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-tertiary/60 to-tertiary rounded-full transition-all duration-700"
                style={{ width: `${product.score}%` }}
              />
            </div>
            <span className="text-[8px] font-mono text-tertiary/50 whitespace-nowrap">
              {activeScoreLabel} {product.score}
            </span>
          </div>
        )}

        {/* Relevance explanation */}
        {product.relevanceExplanation && (
          <p className="text-[9px] text-on-surface-variant/40 leading-relaxed font-sans line-clamp-2 normal-case">
            {product.relevanceExplanation}
          </p>
        )}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="aspect-[4/5] bg-surface-low rounded-sm" />
      <div className="space-y-1.5 px-0.5">
        <div className="h-2 w-12 bg-surface-low rounded" />
        <div className="h-3 w-full bg-surface-low rounded" />
        <div className="h-2 w-16 bg-surface-low rounded" />
      </div>
    </div>
  );
}
