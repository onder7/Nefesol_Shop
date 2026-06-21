import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Cart } from '@/types';

export interface AppliedCoupon {
  code: string;
  value: number;
  type: 'PERCENT' | 'FIXED';
}

interface CartState {
  cart: Cart | null;
  sessionId: string;
  itemCount: number;
  appliedCoupon: AppliedCoupon | null;
  setCart: (cart: Cart | null) => void;
  setAppliedCoupon: (coupon: AppliedCoupon | null) => void;
  clearSession: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      cart: null,
      sessionId: crypto.randomUUID(),
      itemCount: 0,
      appliedCoupon: null,
      setCart: (cart) =>
        set({
          cart,
          itemCount: cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
        }),
      setAppliedCoupon: (coupon) => set({ appliedCoupon: coupon }),
      clearSession: () => set({ sessionId: crypto.randomUUID(), cart: null, itemCount: 0, appliedCoupon: null }),
    }),
    { name: 'cart' },
  ),
);
