import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, getErrorMessage } from '../lib/api-client';
import { useToast } from '../providers/ToastProvider';
import { Order, UserAccount } from '../types/index';
import { useAuthStore } from '../store';

export interface AdminMetrics {
  totalUsers: number;
  totalProducts: number;
  totalRevenue: number;
  pendingOrdersCount: number;
  processingOrdersCount: number;
  lowStockAlertsCount: number;
}

export interface AdminSummaryResponse {
  metrics: AdminMetrics;
  recentOrders: {
    id: string;
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    total: number;
    status: string;
    paymentStatus: string;
    createdAt: string;
  }[];
  lowStockProducts: {
    id: string;
    name: string;
    stock: number;
  }[];
}

export interface SalesAnalyticsResponse {
  monthlySales: {
    label: string;
    value: number;
  }[];
  categoryDistribution: {
    name: string;
    value: number;
    percentage: number;
  }[];
  trafficSources: {
    source: string;
    visitors: number;
    conversionRate: number;
  }[];
}

export const isAdminRole = (role?: string) => {
  return !!role && ['admin', 'super_admin', 'inventory_manager', 'support_agent'].includes(role);
};

export function useAdminSummaryQuery() {
  const currentUser = useAuthStore((state) => state.currentUser);
  return useQuery<AdminSummaryResponse>({
    queryKey: ['admin', 'summary'],
    queryFn: async () => {
      const response = await apiClient.get('/admin/summary');
      return response.data;
    },
    enabled: isAdminRole(currentUser?.role),
  });
}

export function useAdminActivityFeedQuery() {
  const currentUser = useAuthStore((state) => state.currentUser);
  return useQuery<any[]>({
    queryKey: ['admin', 'activity-feed'],
    queryFn: async () => {
      const response = await apiClient.get('/admin/activity-feed');
      return response.data || [];
    },
    enabled: isAdminRole(currentUser?.role),
  });
}

export function useAdminAIInsightsQuery() {
  const currentUser = useAuthStore((state) => state.currentUser);
  return useQuery<{ insights: string; source: string }>({
    queryKey: ['admin', 'ai-insights'],
    queryFn: async () => {
      const response = await apiClient.get('/analytics/ai-insights');
      return response.data;
    },
    enabled: isAdminRole(currentUser?.role),
  });
}

export function useAdminUsersQuery() {
  const currentUser = useAuthStore((state) => state.currentUser);
  return useQuery<UserAccount[]>({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const response = await apiClient.get('/admin/users');
      return response.data.map((user: any) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        joinedDate: new Date(user.createdAt).toLocaleDateString(),
        status: user.isVerified ? 'active' : 'suspended',
      }));
    },
    enabled: isAdminRole(currentUser?.role),
  });
}

export function useUpdateUserRoleMutation() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (params: { id: string; role: string }) => {
      const response = await apiClient.patch(`/admin/users/${params.id}/role`, {
        role: params.role,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      showToast('USER ROLE UPDATED', 'success');
    },
    onError: (error) => {
      showToast(getErrorMessage(error), 'error');
    },
  });
}

export function useDeleteUserMutation() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/admin/users/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      showToast('USER REMOVED SUCCESSFULLY', 'info');
    },
    onError: (error) => {
      showToast(getErrorMessage(error), 'error');
    },
  });
}

export function useAdminOrdersQuery() {
  const currentUser = useAuthStore((state) => state.currentUser);
  return useQuery<Order[]>({
    queryKey: ['admin', 'orders'],
    queryFn: async () => {
      const response = await apiClient.get('/admin/orders');
      return response.data || [];
    },
    enabled: isAdminRole(currentUser?.role),
  });
}

export function useAdminAnalyticsSalesQuery() {
  const currentUser = useAuthStore((state) => state.currentUser);
  return useQuery<SalesAnalyticsResponse>({
    queryKey: ['admin', 'analytics', 'sales'],
    queryFn: async () => {
      const response = await apiClient.get('/analytics/sales');
      return response.data;
    },
    enabled: isAdminRole(currentUser?.role),
  });
}

export function useUpdateOrderStatusMutation() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (params: { id: string; status: string; notes?: string }) => {
      const response = await apiClient.patch(`/orders/${params.id}/status`, {
        status: params.status,
        notes: params.notes,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'summary'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'activity-feed'] });
      showToast('ORDER log status UPDATED', 'success');
    },
    onError: (error) => {
      showToast(getErrorMessage(error), 'error');
    },
  });
}

export function useUpdateOrderTrackingMutation() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (params: { id: string; trackingNumber: string; carrier: string }) => {
      const response = await apiClient.patch(`/orders/${params.id}/tracking`, {
        trackingNumber: params.trackingNumber,
        carrier: params.carrier,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'activity-feed'] });
      showToast('TRACKING NUMBER REGISTERED SUCCESSFULLY', 'success');
    },
    onError: (error) => {
      showToast(getErrorMessage(error), 'error');
    },
  });
}

export function useCancelOrderMutation() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (params: { id: string; notes?: string }) => {
      const response = await apiClient.post(`/orders/${params.id}/cancel`, {
        notes: params.notes,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'summary'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'activity-feed'] });
      showToast('ORDER CANCELLED & STOCK RELEASED', 'info');
    },
    onError: (error) => {
      showToast(getErrorMessage(error), 'error');
    },
  });
}

export function useRefundOrderMutation() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (params: { id: string; amount?: number; reason?: string }) => {
      const response = await apiClient.post(`/orders/${params.id}/refund`, {
        amount: params.amount,
        reason: params.reason,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'summary'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'activity-feed'] });
      showToast('ORDER REFUNDED & STOCK RETURNED', 'success');
    },
    onError: (error) => {
      showToast(getErrorMessage(error), 'error');
    },
  });
}

export function useNotificationsQuery() {
  const currentUser = useAuthStore((state) => state.currentUser);
  return useQuery<any[]>({
    queryKey: ['admin', 'notifications'],
    queryFn: async () => {
      const response = await apiClient.get('/notifications');
      return response.data || [];
    },
    enabled: isAdminRole(currentUser?.role),
  });
}

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.patch(`/notifications/${id}/read`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'notifications'] });
    },
  });
}

export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/notifications/read-all');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'notifications'] });
    },
  });
}

export function useRestoreProductMutation() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post(`/products/${id}/restore`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      showToast('PRODUCT RESTORED TO CATALOG', 'success');
    },
    onError: (error) => {
      showToast(getErrorMessage(error), 'error');
    },
  });
}

export function useToggleFeaturedMutation() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post(`/products/${id}/featured`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      showToast('FEATURED FLAG TOGGLED', 'success');
    },
    onError: (error) => {
      showToast(getErrorMessage(error), 'error');
    },
  });
}

export function useBulkFeatureMutation() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (params: { ids: string[]; isFeatured: boolean }) => {
      const response = await apiClient.post('/products/bulk/feature', params);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      showToast('BULK FEATURE STATE SYNCD', 'success');
    },
    onError: (error) => {
      showToast(getErrorMessage(error), 'error');
    },
  });
}

export function useBulkArchiveMutation() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await apiClient.post('/products/bulk/archive', { ids });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      showToast('BULK PRODUCTS ARCHIVED', 'info');
    },
    onError: (error) => {
      showToast(getErrorMessage(error), 'error');
    },
  });
}

export function useBulkRestoreMutation() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await apiClient.post('/products/bulk/restore', { ids });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      showToast('BULK PRODUCTS RESTORED', 'success');
    },
    onError: (error) => {
      showToast(getErrorMessage(error), 'error');
    },
  });
}

export function useBulkStockMutation() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (updates: { id: string; stockQuantity: number }[]) => {
      const response = await apiClient.post('/products/bulk/stock', { updates });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'summary'] });
      showToast('BULK STOCK QUANTITIES UPDATED', 'success');
    },
    onError: (error) => {
      showToast(getErrorMessage(error), 'error');
    },
  });
}

export function useCouponsQuery() {
  const currentUser = useAuthStore((state) => state.currentUser);
  return useQuery<any[]>({
    queryKey: ['admin', 'coupons'],
    queryFn: async () => {
      const response = await apiClient.get('/coupons');
      return response.data || [];
    },
    enabled: isAdminRole(currentUser?.role),
  });
}

export function useCreateCouponMutation() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (coupon: {
      code: string;
      discountPercent: number;
      expiresAt: string;
      maxUses: number;
    }) => {
      const response = await apiClient.post('/coupons', coupon);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] });
      showToast('COUPON REGISTERED SUCCESSFULLY', 'success');
    },
    onError: (error) => {
      showToast(getErrorMessage(error), 'error');
    },
  });
}

export function useToggleCouponMutation() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (params: { id: string; isActive: boolean }) => {
      const response = await apiClient.patch(`/coupons/${params.id}/toggle`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] });
      showToast('COUPON STATE SYNCD', 'success');
    },
    onError: (error) => {
      showToast(getErrorMessage(error), 'error');
    },
  });
}

export function useAuditLogsQuery() {
  const currentUser = useAuthStore((state) => state.currentUser);
  return useQuery<any[]>({
    queryKey: ['admin', 'audit-logs'],
    queryFn: async () => {
      const response = await apiClient.get('/admin/audit-logs');
      return response.data || [];
    },
    enabled: isAdminRole(currentUser?.role),
  });
}

export function useAiCatalogStatusQuery() {
  const currentUser = useAuthStore((state) => state.currentUser);
  return useQuery<{
    totalProducts: number;
    enrichedCount: number;
    percent: number;
    aesthetics: Record<string, number>;
  }>({
    queryKey: ['admin', 'ai-catalog', 'status'],
    queryFn: async () => {
      const response = await apiClient.get('/ai/catalog/status');
      return response.data;
    },
    enabled: isAdminRole(currentUser?.role),
    refetchInterval: 5000, // Poll every 5s during sync
  });
}

export function useTriggerBulkEnrichmentMutation() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/ai/catalog/enrich');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'ai-catalog', 'status'] });
      showToast('AI CATALOG ENRICHMENT ENQUEUED', 'success');
    },
    onError: (error) => {
      showToast(getErrorMessage(error), 'error');
    },
  });
}

export function useTriggerSingleEnrichmentMutation() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post(`/ai/catalog/enrich/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'ai-catalog', 'status'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      showToast('PRODUCT CLASSIFIED BY AI', 'success');
    },
    onError: (error) => {
      showToast(getErrorMessage(error), 'error');
    },
  });
}

export function useSemanticSearchQuery(q: string, enabled = true) {
  return useQuery<any[]>({
    queryKey: ['products', 'semantic-search', q],
    queryFn: async () => {
      const response = await apiClient.get(`/ai/products/semantic-search?q=${encodeURIComponent(q)}`);
      return response.data || [];
    },
    enabled: enabled && q.trim().length > 0,
  });
}

export function useCompatibleOutfitsQuery(id: string) {
  return useQuery<any[]>({
    queryKey: ['products', 'compatible-outfits', id],
    queryFn: async () => {
      const response = await apiClient.get(`/ai/products/${id}/compatible-outfits`);
      return response.data || [];
    },
    enabled: !!id,
  });
}

export function useAiTelemetryQuery() {
  const currentUser = useAuthStore((state) => state.currentUser);
  return useQuery<any>({
    queryKey: ['admin', 'ai-telemetry'],
    queryFn: async () => {
      const response = await apiClient.get('/ai/telemetry');
      return response.data;
    },
    enabled: isAdminRole(currentUser?.role),
    refetchInterval: 15000,
  });
}
