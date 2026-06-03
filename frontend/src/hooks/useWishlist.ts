import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, getErrorMessage } from '../lib/api-client';
import { mapBackendProductToFrontend } from '../lib/mappers';
import { Product } from '../types/index';
import { useAuthStore, useWishlistStore } from '../store';
import { useToast } from '../providers/ToastProvider';
import { useHydrated } from './useHydrated';

export function useWishlistQuery() {
  const hydrated = useHydrated();
  const storeCurrentUser = useAuthStore((state) => state.currentUser);
  const currentUser = hydrated ? storeCurrentUser : null;
  const guestItems = useWishlistStore((state) => state.items);
  
  // Stable query key: use sorted IDs string instead of raw array reference
  // to prevent query key identity changes on every Zustand update
  const guestKey = useMemo(
    () => guestItems.map((item) => item.id).sort().join(','),
    [guestItems]
  );

  return useQuery<Product[]>({
    queryKey: ['wishlist', currentUser?.id || 'guest', guestKey],
    queryFn: async () => {
      if (!currentUser) return guestItems;
      const response = await apiClient.get('/wishlist');
      // Response contains array of wishlistItem which has a product relation
      return (response.data || []).map((item: any) => mapBackendProductToFrontend(item.product));
    },
  });
}

export function useToggleWishlistMutation() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const hydrated = useHydrated();
  const storeCurrentUser = useAuthStore((state) => state.currentUser);
  const currentUser = hydrated ? storeCurrentUser : null;
  const guestToggleWishlist = useWishlistStore((state) => state.toggleWishlist);
  const guestWishlistItems = useWishlistStore((state) => state.items);

  return useMutation({
    mutationFn: async (productOrId: string | Product) => {
      const productId = typeof productOrId === 'string' ? productOrId : productOrId.id;
      
      if (currentUser) {
        const response = await apiClient.post('/wishlist/toggle', { productId });
        return response.data;
      } else {
        // For guest, resolve product
        let product: Product | undefined;
        if (typeof productOrId === 'object') {
          product = productOrId;
        } else {
          // Find in React Query cache
          const queries = queryClient.getQueriesData<Product[]>({ queryKey: ['products'] });
          for (const [, data] of queries) {
            const found = data?.find((p) => p.id === productId);
            if (found) {
              product = found;
              break;
            }
          }
          if (!product) {
            // Fallback: fetch from API
            const response = await apiClient.get(`/products/${productId}`);
            product = mapBackendProductToFrontend(response.data);
          }
        }

        if (!product) {
          throw new Error('Product details could not be resolved.');
        }

        guestToggleWishlist(product);
        const exists = guestWishlistItems.some((item) => item.id === productId);
        return {
          status: exists ? 'added' : 'removed',
          message: exists ? 'Added to wishlist' : 'Removed from wishlist',
        };
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      showToast((data.message || '').toUpperCase(), 'success');
    },
    onError: (error) => {
      showToast(getErrorMessage(error), 'error');
    },
  });
}

// Helper hook to check if a product is saved
export function useIsWishlisted(productId: string) {
  const { data: wishlistItems = [] } = useWishlistQuery();
  const hydrated = useHydrated();
  return hydrated ? wishlistItems.some((item) => item.id === productId) : false;
}
