import { api } from './api';
import type { Address, Order } from '@/types';

export interface CheckoutInitResponse {
  checkoutFormContent: string;
  token: string;
  conversationId: string;
  subtotal: number;
  shippingFee: number;
  total: number;
}

export const checkoutApi = {
  // Address CRUD
  listAddresses: () =>
    api.get<{ success: boolean; data: Address[] }>('/addresses'),

  createAddress: (data: Omit<Address, 'id' | 'isDefault'> & { isDefault?: boolean }) =>
    api.post<{ success: boolean; data: Address }>('/addresses', data),

  updateAddress: (id: string, data: Partial<Address>) =>
    api.put<{ success: boolean; data: Address }>(`/addresses/${id}`, data),

  deleteAddress: (id: string) =>
    api.delete<{ success: boolean }>(`/addresses/${id}`),

  setDefaultAddress: (id: string) =>
    api.patch<{ success: boolean; data: Address }>(`/addresses/${id}/default`),

  // Checkout
  initialize: (addressId: string) =>
    api.post<{ success: boolean; data: CheckoutInitResponse }>('/checkout/initialize', { addressId }),

  // Orders
  listOrders: () =>
    api.get<{ success: boolean; data: Order[] }>('/checkout/orders'),

  getOrder: (id: string) =>
    api.get<{ success: boolean; data: Order }>(`/checkout/orders/${id}`),
};
