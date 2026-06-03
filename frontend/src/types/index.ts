export interface Product {
  id: string;
  slug: string;
  name: string;
  category: 'outerwear' | 'tops' | 'bottoms' | 'footwear' | 'accessories';
  price: number;
  description: string;
  images: string[];
  specs: string[];
  fit: string;
  care: string;
  sizes: string[];
  colors: string[];
  techTags: string[];
  isNew?: boolean;
  isLimited?: boolean;
  compareAtPrice?: number;
  stockQuantity?: number;
  reservedStock?: number;
  lowStockThreshold?: number;
  sku?: string;
  barcode?: string;
  inventoryStatus?: string;
  deletedAt?: string;
  isFeatured?: boolean;
}

export interface Review {
  id: string;
  productId: string;
  author: string;
  rating: number;
  date: string;
  content: string;
  isVerified: boolean;
}

export interface Order {
  id: string;
  orderNumber?: string;
  paymentStatus?: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  user?: {
    name: string;
    email: string;
  };
  items: {
    productId: string;
    productName: string;
    size: string;
    color: string;
    quantity: number;
    price: number;
    image: string;
  }[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded' | 'failed';
  createdAt: string;
  address: {
    firstName: string;
    lastName: string;
    address: string;
    apartment?: string;
    city: string;
    country: string;
    postalCode: string;
  };
  shippingAddress?: {
    id: string;
    orderId: string;
    address: string;
    city: string;
    country: string;
    postalCode: string;
    phone: string;
  };
  trackingNumber?: string;
  carrier?: string;
  estimatedDelivery?: string;
  events?: any[];
  refunds?: any[];
  currency?: string;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'super_admin' | 'inventory_manager' | 'support_agent' | 'customer';
  joinedDate?: string;
  status?: 'active' | 'suspended';
  createdAt?: string;
  isVerified?: boolean;
}
