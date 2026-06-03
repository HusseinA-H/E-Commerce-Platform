import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, getErrorMessage } from '../lib/api-client';
import { mapBackendProductToFrontend } from '../lib/mappers';
import { Product } from '../types/index';
import { useAuthStore, useCartStore, CartItem as LocalCartItem } from '../store';
import { useToast } from '../providers/ToastProvider';
import { useHydrated } from './useHydrated';

export interface CartItem {
  id: string; // DB cart item id or generated guest id
  product: Product;
  quantity: number;
  size: string;
  color: string;
}

export function useCartQuery() {
  const hydrated = useHydrated();
  const storeCurrentUser = useAuthStore((state) => state.currentUser);
  const currentUser = hydrated ? storeCurrentUser : null;

  return useQuery<CartItem[]>({
    queryKey: ['cart', currentUser?.id || 'guest'],
    queryFn: async () => {
      if (!currentUser) return [];
      const response = await apiClient.get('/cart');
      return (response.data || []).map((item: any) => ({
        id: item.id,
        product: mapBackendProductToFrontend(item.product),
        quantity: item.quantity,
        size: item.size,
        color: item.color,
      }));
    },
    enabled: !!currentUser,
  });
}

export function useCart() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const hydrated = useHydrated();
  const storeCurrentUser = useAuthStore((state) => state.currentUser);
  const currentUser = hydrated ? storeCurrentUser : null;
  
  // Zustand fallback for guest cart — use FINE-GRAINED selectors to avoid full-store subscription
  const guestItems = useCartStore((state) => state.items);
  const guestAddItem = useCartStore((state) => state.addItem);
  const guestRemoveItem = useCartStore((state) => state.removeItem);
  const guestUpdateQuantity = useCartStore((state) => state.updateQuantity);
  const guestClearCart = useCartStore((state) => state.clearCart);
  const guestDiscountPct = useCartStore((state) => state.discountPercentage);
  const { data: dbCartItems = [], isLoading } = useCartQuery();

  // Unified items selector
  const items = (hydrated && currentUser) ? dbCartItems : (hydrated ? guestItems : []).map((item, idx) => ({
    id: `guest-${idx}`,
    product: item.product,
    quantity: item.quantity,
    size: item.size,
    color: item.color,
  }));

  // Helper to calculate totals
  const getTotals = () => {
    const subtotal = items.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
    const discount = subtotal * (guestDiscountPct / 100);
    const taxableAmount = subtotal - discount;
    const tax = taxableAmount * 0.08; // 8% sales tax
    const total = taxableAmount + tax;
    return { subtotal, discount, tax, total };
  };

  // Add Item Mutation/Action
  const addToCartMutation = useMutation({
    mutationFn: async (params: { product: Product; quantity: number; size: string; color: string }) => {
      if (currentUser) {
        // Send to backend
        const response = await apiClient.post('/cart', {
          productId: params.product.id,
          quantity: params.quantity,
          size: params.size,
          color: params.color,
        });
        return response.data;
      } else {
        // Zustand guest cart
        guestAddItem(params.product, params.quantity, params.size, params.color);
        return null;
      }
    },
    onSuccess: () => {
      if (currentUser) {
        queryClient.invalidateQueries({ queryKey: ['cart'] });
      }
      showToast('ADDED TO YOUR BAG', 'success');
    },
    onError: (error) => {
      showToast(getErrorMessage(error), 'error');
    },
  });

  // Update Quantity Mutation/Action
  const updateQuantityMutation = useMutation({
    mutationFn: async (params: { itemId: string; productId: string; size: string; color: string; quantity: number }) => {
      if (currentUser) {
        if (params.quantity <= 0) {
          await apiClient.delete(`/cart/${params.itemId}`);
        } else {
          await apiClient.patch(`/cart/${params.itemId}`, { quantity: params.quantity });
        }
      } else {
        guestUpdateQuantity(params.productId, params.size, params.color, params.quantity);
      }
    },
    onSuccess: () => {
      if (currentUser) {
        queryClient.invalidateQueries({ queryKey: ['cart'] });
      }
      showToast('QUANTITY UPDATED', 'success');
    },
    onError: (error) => {
      showToast(getErrorMessage(error), 'error');
    },
  });

  // Remove Item Mutation/Action
  const removeItemMutation = useMutation({
    mutationFn: async (params: { itemId: string; productId: string; size: string; color: string }) => {
      if (currentUser) {
        await apiClient.delete(`/cart/${params.itemId}`);
      } else {
        guestRemoveItem(params.productId, params.size, params.color);
      }
    },
    onSuccess: () => {
      if (currentUser) {
        queryClient.invalidateQueries({ queryKey: ['cart'] });
      }
      showToast('ITEM REMOVED FROM BAG', 'info');
    },
    onError: (error) => {
      showToast(getErrorMessage(error), 'error');
    },
  });

  // Clear Cart Mutation/Action
  const clearCartMutation = useMutation({
    mutationFn: async () => {
      if (currentUser) {
        await apiClient.delete('/cart');
      } else {
        guestClearCart();
      }
    },
    onSuccess: () => {
      if (currentUser) {
        queryClient.invalidateQueries({ queryKey: ['cart'] });
      }
    },
    onError: (error) => {
      showToast(getErrorMessage(error), 'error');
    },
  });

  // Merge Guest Cart to DB Cart upon login
  const mergeGuestCartMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser || guestItems.length === 0) return;
      
      // Post all items sequentially or parallel
      const mergePromises = guestItems.map((item) =>
        apiClient.post('/cart', {
          productId: item.product.id,
          quantity: item.quantity,
          size: item.size,
          color: item.color,
        })
      );
      
      await Promise.all(mergePromises);
      guestClearCart(); // Clear local guest storage
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      showToast('SYNCHRONIZED GUEST CART WITH CLOUD', 'success');
    },
  });

  return {
    items,
    isLoading: !hydrated || (currentUser ? isLoading : false),
    getTotals,
    addToCart: addToCartMutation.mutateAsync,
    updateQuantity: updateQuantityMutation.mutate,
    removeItem: removeItemMutation.mutate,
    clearCart: clearCartMutation.mutate,
    mergeGuestCart: mergeGuestCartMutation.mutateAsync,
    isMerging: mergeGuestCartMutation.isPending,
  };
}
