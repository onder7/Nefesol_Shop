import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Cart } from '@/types';

interface CartState {
  cart: Cart | null;
  sessionId: string;
  itemCount: number;
  setCart: (cart: Cart | null) => void;
  clearSession: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      cart: null,
      sessionId: crypto.randomUUID(),
      itemCount: 0,
      setCart: (cart) =>
        set({
          cart,
          itemCount: cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
        }),
      clearSession: () => set({ sessionId: crypto.randomUUID(), cart: null, itemCount: 0 }),
    }),
    { name: 'cart' },
  ),
);
