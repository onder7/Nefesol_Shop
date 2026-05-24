import { api } from './api';
import type { Product, Category, Brand } from '@/types';

export interface ProductFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'popular';
}

export interface ProductListResponse {
  success: boolean;
  items: Product[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export const productApi = {
  list: (filters: ProductFilters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== '') params.set(k, String(v));
    });
    return api.get<ProductListResponse>(`/products?${params}`);
  },

  featured: (limit = 8) =>
    api.get<{ success: boolean; data: Product[] }>(`/products/featured?limit=${limit}`),

  get: (slug: string) =>
    api.get<{ success: boolean; data: Product }>(`/products/${slug}`),

  categories: () =>
    api.get<{ success: boolean; data: Category[] }>('/categories'),

  category: (slug: string) =>
    api.get<{ success: boolean; data: Category }>(`/categories/${slug}`),

  brands: () =>
    api.get<{ success: boolean; data: Brand[] }>('/brands'),

  shippingConfig: () =>
    api.get<{ success: boolean; data: { shippingFee: number; freeShippingThreshold: number } }>('/shipping-config'),
};
