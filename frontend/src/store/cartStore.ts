import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartState {
  itemCount: number;
  setItemCount: (count: number) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      itemCount: 0,
      setItemCount: (count) => set({ itemCount: count }),
    }),
    { name: 'cart' },
  ),
);
