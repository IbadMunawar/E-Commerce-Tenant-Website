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
  // === BARGAIN_BAAS_INTEGRATION_START ===
  /** BargainBaaS negotiation session ID, present only when the price was negotiated */
  sessionId?: string;
  // === BARGAIN_BAAS_INTEGRATION_END ===
}

interface CartStore {
  items: CartItem[];
  // === BARGAIN_BAAS_INTEGRATION_START ===
  addToCart: (product: Product, negotiatedPrice?: number, sessionId?: string) => void;
  // === BARGAIN_BAAS_INTEGRATION_END ===
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
                // === BARGAIN_BAAS_INTEGRATION_START ===
                // Store the session ID to forward to checkout verification proxy
                ...(sessionId !== undefined && { sessionId }),
                // === BARGAIN_BAAS_INTEGRATION_END ===
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
      cartTotal: () => get().items.reduce((total, item) => total + item.finalPrice * item.quantity, 0),
      cartCount: () => get().items.reduce((count, item) => count + item.quantity, 0),
    }),
    { name: 'techstore-cart' }
  )
);

