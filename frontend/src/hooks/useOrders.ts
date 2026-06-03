import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, getErrorMessage } from '../lib/api-client';
import { Order } from '../types/index';
import { useToast } from '../providers/ToastProvider';
import { useAuthStore } from '../store';

export function useOrdersQuery() {
  const storeCurrentUser = useAuthStore((state) => state.currentUser);
  return useQuery<Order[]>({
    queryKey: ['orders', storeCurrentUser?.id],
    queryFn: async () => {
      const response = await apiClient.get('/orders');
      return response.data || [];
    },
    enabled: !!storeCurrentUser,
  });
}

export function useOrderQuery(id: string) {
  const storeCurrentUser = useAuthStore((state) => state.currentUser);
  return useQuery<Order>({
    queryKey: ['order', id],
    queryFn: async () => {
      const response = await apiClient.get(`/orders/${id}`);
      return response.data;
    },
    enabled: !!id && !!storeCurrentUser,
  });
}

export function useCreateOrderMutation() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (shippingData: {
      address: string;
      city: string;
      country: string;
      postalCode: string;
      phone: string;
      couponCode?: string;
    }) => {
      const response = await apiClient.post('/orders', shippingData);
      return response.data; // Returns created Order object
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: (error) => {
      showToast(getErrorMessage(error), 'error');
    },
  });
}

export function useCreatePaymentIntentMutation() {
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const response = await apiClient.post(`/payments/create-intent/${orderId}`);
      return response.data; // { clientSecret, paymentIntentId, amount, currency, isMock }
    },
    onError: (error) => {
      showToast(getErrorMessage(error), 'error');
    },
  });
}

export function useSimulatePaymentWebhookMutation() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (params: { orderId: string; paymentIntentId: string }) => {
      // Simulate Stripe webhook callback directly on backend mock webhook handler
      const response = await apiClient.post('/payments/webhook', {
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: params.paymentIntentId,
            metadata: {
              orderId: params.orderId,
            },
          },
        },
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', variables.orderId] });
      showToast('PAYMENT CONFIRMED SUCCESSFULLY', 'success');
    },
    onError: (error) => {
      showToast(getErrorMessage(error), 'error');
    },
  });
}
