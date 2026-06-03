'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LoyaltyAccount {
  id: string;
  points: number;
  lifetimePoints: number;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  nextTier: string | null;
  pointsNeeded: number;
  tierProgressPct: number;
  transactions: LoyaltyTransaction[];
  createdAt: string;
  updatedAt: string;
}

export interface LoyaltyTransaction {
  id: string;
  type: 'earned' | 'spent' | 'expired' | 'adjusted';
  points: number;
  reason: string;
  referenceId?: string;
  createdAt: string;
}

export interface LoyaltyReward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  rewardType: 'discount_percent' | 'discount_fixed' | 'free_shipping' | 'exclusive_product';
  rewardValue: number;
  minTier: string;
  isActive: boolean;
  totalStock: number | null;
  usedCount: number;
  canAfford: boolean;
  tierEligible: boolean;
}

export interface ReferralAnalytics {
  code: string | null;
  referralLink: string | null;
  totalReferrals: number;
  convertedReferrals: number;
  conversionRate: number;
  totalPointsEarned: number;
  events: any[];
}

// ─── Loyalty Hooks ────────────────────────────────────────────────────────────

export function useLoyaltyAccount() {
  return useQuery<LoyaltyAccount>({
    queryKey: ['loyalty', 'account'],
    queryFn: async () => {
      const { data } = await apiClient.get<LoyaltyAccount>('/loyalty');
      return data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

export function useLoyaltyTransactions(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['loyalty', 'transactions', page],
    queryFn: async () => {
      const { data } = await apiClient.get(`/loyalty/transactions?page=${page}&limit=${limit}`);
      return data as { transactions: LoyaltyTransaction[]; total: number; page: number };
    },
  });
}

export function useLoyaltyRewards() {
  return useQuery<LoyaltyReward[]>({
    queryKey: ['loyalty', 'rewards'],
    queryFn: async () => {
      const { data } = await apiClient.get<LoyaltyReward[]>('/loyalty/rewards');
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useRedeemReward() {
  const qc = useQueryClient();
  return useMutation<any, Error, string>({
    mutationFn: async (rewardId: string) => {
      const { data } = await apiClient.post(`/loyalty/redeem/${rewardId}`);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['loyalty'] });
    },
  });
}

// ─── Referral Hooks ───────────────────────────────────────────────────────────

export function useReferralCode() {
  return useQuery<{ code: string; referralLink: string; usesCount: number }>({
    queryKey: ['referral', 'code'],
    queryFn: async () => {
      const { data } = await apiClient.get('/referral/my-code');
      return data as { code: string; referralLink: string; usesCount: number };
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useReferralAnalytics() {
  return useQuery<ReferralAnalytics>({
    queryKey: ['referral', 'analytics'],
    queryFn: async () => {
      const { data } = await apiClient.get<ReferralAnalytics>('/referral/analytics');
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useApplyReferralCode() {
  const qc = useQueryClient();
  return useMutation<any, Error, string>({
    mutationFn: async (code: string) => {
      const { data } = await apiClient.post('/referral/apply', { code });
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['referral'] });
      void qc.invalidateQueries({ queryKey: ['loyalty'] });
    },
  });
}

// ─── Loyalty Admin Stats ──────────────────────────────────────────────────────

export function useLoyaltyAdminStats() {
  return useQuery({
    queryKey: ['loyalty', 'admin', 'stats'],
    queryFn: async () => {
      const { data } = await apiClient.get('/loyalty/admin/stats');
      return data as {
        totalAccounts: number;
        tierDistribution: Record<string, number>;
        totalPointsIssued: number;
        totalRedemptions: number;
      };
    },
    refetchInterval: 1000 * 30,
  });
}

export function useReferralAdminStats() {
  return useQuery({
    queryKey: ['referral', 'admin', 'stats'],
    queryFn: async () => {
      const { data } = await apiClient.get('/referral/admin/stats');
      return data as {
        totalCodes: number;
        totalReferrals: number;
        convertedReferrals: number;
        conversionRate: number;
        topReferrers: any[];
      };
    },
    refetchInterval: 1000 * 30,
  });
}

export function useRetentionAnalytics() {
  return useQuery({
    queryKey: ['growth', 'retention'],
    queryFn: async () => {
      const { data } = await apiClient.get('/growth/retention-analytics');
      return data as {
        totalCustomers: number;
        activeCustomers30d: number;
        newCustomers30d: number;
        retentionRate: number;
        avgOrderValue: number;
        avgCLV: number;
        topSpenders: { userId: string; totalSpend: number }[];
      };
    },
    refetchInterval: 1000 * 60,
  });
}
