'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'LOW_STOCK' | 'ORDER_STATUS' | 'SYSTEM_ALERT' | 'WISHLIST_RESTOCK' | 'PRICE_DROP' | 'AI_RECOMMENDATION' | 'PERSONALIZED_PROMO';
  isRead: boolean;
  userId: string | null;
  createdAt: string;
}

const NOTIFICATION_TYPE_CONFIG: Record<string, { emoji: string; color: string }> = {
  ORDER_STATUS: { emoji: '📦', color: 'text-blue-400' },
  WISHLIST_RESTOCK: { emoji: '🔥', color: 'text-orange-400' },
  PRICE_DROP: { emoji: '📉', color: 'text-green-400' },
  AI_RECOMMENDATION: { emoji: '✨', color: 'text-tertiary' },
  PERSONALIZED_PROMO: { emoji: '🎁', color: 'text-purple-400' },
  LOW_STOCK: { emoji: '⚠️', color: 'text-yellow-400' },
  SYSTEM_ALERT: { emoji: '🔔', color: 'text-white/60' },
};

export const getNotificationConfig = (type: string) =>
  NOTIFICATION_TYPE_CONFIG[type] ?? { emoji: '🔔', color: 'text-white/60' };

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useNotifications() {
  return useQuery<AppNotification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await apiClient.get<AppNotification[]>('/notifications');
      return data;
    },
    refetchInterval: 1000 * 30, // Poll every 30s
    staleTime: 1000 * 15,
  });
}

export function useUnreadCount() {
  return useQuery<{ count: number }>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ count: number }>('/notifications/unread-count');
      return data;
    },
    refetchInterval: 1000 * 30,
    staleTime: 1000 * 15,
  });
}

export function useMarkAsRead() {
  const qc = useQueryClient();
  return useMutation<any, Error, string>({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.patch(`/notifications/${id}/read`);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllAsRead() {
  const qc = useQueryClient();
  return useMutation<any, Error, void>({
    mutationFn: async () => {
      const { data } = await apiClient.post('/notifications/read-all');
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation<any, Error, string>({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.delete(`/notifications/${id}`);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
