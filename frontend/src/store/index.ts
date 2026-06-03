import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product, Order, UserAccount } from '../types/index';
import { apiClient } from '../lib/api-client';

// --- Cart Store (Guest Fallback UI Store) ---
export interface CartItem {
  product: Product;
  quantity: number;
  size: string;
  color: string;
}

interface CartState {
  items: CartItem[];
  promoCode: string | null;
  discountPercentage: number;
  addItem: (product: Product, quantity: number, size: string, color: string) => void;
  removeItem: (productId: string, size: string, color: string) => void;
  updateQuantity: (productId: string, size: string, color: string, quantity: number) => void;
  applyPromoCode: (code: string) => boolean;
  clearCart: () => void;
  getTotals: () => { subtotal: number; discount: number; tax: number; total: number };
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      promoCode: null,
      discountPercentage: 0,
      addItem: (product, quantity, size, color) => {
        const items = get().items;
        const existingIndex = items.findIndex(
          (item) => item.product.id === product.id && item.size === size && item.color === color
        );

        if (existingIndex > -1) {
          const updatedItems = [...items];
          updatedItems[existingIndex].quantity += quantity;
          set({ items: updatedItems });
        } else {
          set({ items: [...items, { product, quantity, size, color }] });
        }
      },
      removeItem: (productId, size, color) => {
        set({
          items: get().items.filter(
            (item) => !(item.product.id === productId && item.size === size && item.color === color)
          ),
        });
      },
      updateQuantity: (productId, size, color, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId, size, color);
          return;
        }
        set({
          items: get().items.map((item) =>
            item.product.id === productId && item.size === size && item.color === color
              ? { ...item, quantity }
              : item
          ),
        });
      },
      applyPromoCode: (code) => {
        const formattedCode = (code || '').toUpperCase();
        if (formattedCode === 'APEX10') {
          set({ promoCode: 'APEX10', discountPercentage: 10 });
          return true;
        }
        return false;
      },
      clearCart: () => set({ items: [], promoCode: null, discountPercentage: 0 }),
      getTotals: () => {
        const items = get().items;
        const discountPercentage = get().discountPercentage;
        const subtotal = items.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
        const discount = subtotal * (discountPercentage / 100);
        const taxableAmount = subtotal - discount;
        const tax = taxableAmount * 0.08; // 8% sales tax
        const total = taxableAmount + tax;
        return { subtotal, discount, tax, total };
      },
    }),
    { name: 'apex-luxe-cart' }
  )
);

// --- Wishlist Store (Guest Fallback Store) ---
interface WishlistState {
  items: Product[];
  toggleWishlist: (product: Product) => void;
  hasItem: (productId: string) => boolean;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      toggleWishlist: (product) => {
        const items = get().items;
        const exists = items.some((item) => item.id === product.id);
        if (exists) {
          set({ items: items.filter((item) => item.id !== product.id) });
        } else {
          set({ items: [...items, product] });
        }
      },
      hasItem: (productId) => get().items.some((item) => item.id === productId),
    }),
    { name: 'apex-luxe-wishlist' }
  )
);

// --- Auth Store (Session UI State) ---
interface AuthState {
  currentUser: UserAccount | null;
  login: (email: string, passkey?: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, passkey?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUserProfile: (name: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: null, // Start logged out by default
      login: async (email, passkey = 'Password123!') => {
        try {
          const response = await apiClient.post('/auth/login', {
            email,
            password: passkey,
          });
          const { user } = response.data;
          set({ currentUser: user });
          return { success: true };
        } catch (error: any) {
          const errMsg = error.response?.data?.message || error.message || 'Login failed.';
          const errorText = Array.isArray(errMsg) ? errMsg.join(', ') : String(errMsg);
          return { success: false, error: errorText };
        }
      },
      register: async (name, email, passkey = 'Password123!') => {
        try {
          // Register
          await apiClient.post('/auth/register', { name, email, password: passkey });
          return { success: true };
        } catch (error: any) {
          const errMsg = error.response?.data?.message || error.message || 'Registration failed.';
          const errorText = Array.isArray(errMsg) ? errMsg.join(', ') : String(errMsg);
          return { success: false, error: errorText };
        }
      },
      logout: async () => {
        try {
          await apiClient.post('/auth/logout', {});
        } catch (e) {
          console.warn('Backend logout failed, clearing client session anyway.');
        }
        set({ currentUser: null });
      },
      updateUserProfile: (name) => {
        const user = get().currentUser;
        if (user) {
          set({ currentUser: { ...user, name } });
        }
      },
    }),
    { name: 'apex-luxe-auth' }
  )
);

// --- Order Store (Guest order history fallback) ---
interface OrderState {
  orders: Order[];
  createOrder: (order: Omit<Order, 'id' | 'createdAt'>) => Order;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set, get) => ({
      orders: [],
      createOrder: (orderData) => {
        const newOrder: Order = {
          ...orderData,
          id: `APX-${Math.floor(1000 + Math.random() * 9000)}`,
          createdAt: new Date().toISOString(),
        };
        set({ orders: [newOrder, ...get().orders] });
        return newOrder;
      },
      updateOrderStatus: (orderId, status) => {
        set({
          orders: get().orders.map((o) => (o.id === orderId ? { ...o, status } : o)),
        });
      },
    }),
    { name: 'apex-luxe-orders' }
  )
);

// --- UI Store (Modal toggles) ---
interface UIState {
  isAISearchOpen: boolean;
  isAIStylistOpen: boolean;
  openAISearch: () => void;
  closeAISearch: () => void;
  openAIStylist: () => void;
  closeAIStylist: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isAISearchOpen: false,
  isAIStylistOpen: false,
  openAISearch: () => set({ isAISearchOpen: true }),
  closeAISearch: () => set({ isAISearchOpen: false }),
  openAIStylist: () => set({ isAIStylistOpen: true }),
  closeAIStylist: () => set({ isAIStylistOpen: false }),
}));
