'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { useAuthStore } from '../store';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SearchResult {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number;
  description: string;
  category: { id: string; name: string; slug: string };
  images: { url: string; isPrimary: boolean }[];
  colors: { color: string }[];
  sizes: { size: string }[];
  isNew: boolean;
  isLimited: boolean;
  inventoryStatus: string;
  score: number;
  vectorScore: number;
  relevanceExplanation: string;
  whyRetrieved: string;
  personalized: boolean;
}

export interface SearchResponse {
  results: SearchResult[];
  intent: Record<string, any> | null;
  totalCount: number;
  fromCache: boolean;
  latencyMs: number;
  query: string;
  aiNarrative: string;
}

export interface AutocompleteResponse {
  suggestions: string[];
  intent: Record<string, any>;
}

export interface VisualSearchResult {
  products: any[];
  visualDescription: string;
  extractedAttributes: {
    colors: string[];
    style: string;
    garmentType: string;
    fit: string;
    aesthetic: string;
  };
  whyRetrieved: string;
}

// ─── Semantic Search ──────────────────────────────────────────────────────────

/**
 * Full semantic + personalized search pipeline.
 * Passes userId when available for StyleDNA personalization.
 */
export function useSemanticSearch(query: string, enabled = true) {
  const { currentUser } = useAuthStore();

  return useQuery<SearchResponse>({
    queryKey: ['search', 'semantic', query, currentUser?.id],
    queryFn: async () => {
      const params = new URLSearchParams({ q: query });
      if (currentUser?.id) params.set('userId', currentUser.id);
      const { data } = await apiClient.get<SearchResponse>(`/search?${params.toString()}`);
      return data;
    },
    enabled: enabled && query.trim().length >= 2,
    staleTime: 1000 * 60 * 5, // 5 minutes — matches Redis cache TTL
    placeholderData: (prev) => prev,
  });
}

// ─── Autocomplete ─────────────────────────────────────────────────────────────

/**
 * Fast intent-aware autocomplete suggestions for live-as-you-type UX.
 */
export function useAutocomplete(partial: string, enabled = true) {
  return useQuery<AutocompleteResponse>({
    queryKey: ['search', 'autocomplete', partial],
    queryFn: async () => {
      const { data } = await apiClient.get<AutocompleteResponse>(
        `/search/autocomplete?q=${encodeURIComponent(partial)}`,
      );
      return data;
    },
    enabled: enabled && partial.trim().length >= 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// ─── Visual Search ────────────────────────────────────────────────────────────

/**
 * Mutation hook for visual product search by image URL.
 */
export function useVisualSearch() {
  return useMutation<VisualSearchResult, Error, { imageUrl: string }>({
    mutationFn: async ({ imageUrl }) => {
      const { data } = await apiClient.post<VisualSearchResult>('/search/visual', { imageUrl });
      return data;
    },
  });
}

// ─── Trending Products ────────────────────────────────────────────────────────

/**
 * AI-ranked trending products.
 */
export function useTrendingProducts(limit = 12) {
  return useQuery({
    queryKey: ['search', 'trending', limit],
    queryFn: async () => {
      const { data } = await apiClient.get(`/search/trending?limit=${limit}`);
      return data as any[];
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

// ─── Search Analytics (Admin) ─────────────────────────────────────────────────

/**
 * Admin: full 30-day search intelligence summary.
 */
export function useSearchAnalytics() {
  return useQuery({
    queryKey: ['search', 'analytics'],
    queryFn: async () => {
      const { data } = await apiClient.get('/search/analytics');
      return data;
    },
    refetchInterval: 1000 * 30, // Auto-refresh every 30 seconds
  });
}

// ─── Click/Conversion Tracking ────────────────────────────────────────────────

/**
 * Track a user click on a search result.
 */
export function useTrackSearchClick() {
  return useMutation<void, Error, { query: string; type: 'click' | 'convert' }>({
    mutationFn: async ({ query, type }) => {
      await apiClient.post('/search/track', { query, type });
    },
    // Silent fire-and-forget — do not show errors to user
    onError: () => {},
  });
}

// ─── Index Rebuild (Admin) ────────────────────────────────────────────────────

/**
 * Admin: Trigger vector index rebuild.
 */
export function useRebuildSearchIndex() {
  return useMutation<{ indexed: number }, Error, void>({
    mutationFn: async () => {
      const { data } = await apiClient.post<{ indexed: number }>('/search/index/rebuild');
      return data;
    },
  });
}
