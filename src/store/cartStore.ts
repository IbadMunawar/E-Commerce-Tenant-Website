import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from '@/data/products';

export interface CartItem {
  id: string;
  name: string;
  imageUrl: string;
  originalPrice: number;
  finalPrice: number;
  quantity: number;
  /** BargainBaaS negotiation session ID, present only when the price was negotiated */
  sessionId?: string;
}

interface CartStore {
  items: CartItem[];
  addToCart: (product: Product, negotiatedPrice?: number, sessionId?: string) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  cartTotal: () => number;
  cartCount: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addToCart: (product, negotiatedPrice, sessionId) => {
        const finalPrice = negotiatedPrice ?? product.originalPrice;
        set((state) => {
          const existing = state.items.find((item) => item.id === product.id);
          if (existing) {
            return {
              items: state.items.map((item) =>
                item.id === product.id
                  ? { ...item, quantity: item.quantity + 1, finalPrice }
                  : item
              ),
            };
          }
          return {
            items: [
              ...state.items,
              {
                id: product.id,
                name: product.name,
                imageUrl: product.imageUrl,
                originalPrice: product.originalPrice,
                finalPrice,
                quantity: 1,
                // Store the BargainBaaS session ID so it can be forwarded
                // to the checkout API for server-side price verification.
                ...(sessionId !== undefined && { sessionId }),
              },
            ],
          };
        });
      },

      removeFromCart: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));
      },

      clearCart: () => set({ items: [] }),

      cartTotal: () => {
        return get().items.reduce(
          (total, item) => total + item.finalPrice * item.quantity,
          0
        );
      },

      cartCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      },
    }),
    {
      name: 'techstore-cart',
    }
  )
);
