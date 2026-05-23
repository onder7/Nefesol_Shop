export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface User {
  id: string;
  email: string;
  role: 'CUSTOMER' | 'ADMIN';
  profile?: { firstName?: string; lastName?: string; phone?: string; avatarUrl?: string };
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
  children?: Category[];
  imageUrl?: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
}

export interface ProductVariant {
  id: string;
  sku: string;
  price: number;
  compareAt?: number;
  stockQty: number;
  attributes: Record<string, string>;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  category: Category;
  brand?: Brand;
  variants: ProductVariant[];
  images: { id: string; url: string; altText?: string; isPrimary: boolean }[];
  tags: { tag: string }[];
  reviews?: { rating: number }[];
}

export interface CartItem {
  id: string;
  variantId: string;
  quantity: number;
  priceAtAdd: number;
  variant: ProductVariant & { product: Pick<Product, 'id' | 'name' | 'slug' | 'images'> };
}

export interface Cart {
  id: string;
  items: CartItem[];
}

export interface Order {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  createdAt: string;
  items: { id: string; quantity: number; unitPrice: number; variant: ProductVariant & { product: Pick<Product, 'name' | 'slug'> } }[];
}

export interface Address {
  id: string;
  title: string;
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  district: string;
  address: string;
  isDefault: boolean;
  type: 'BILLING' | 'SHIPPING';
}
