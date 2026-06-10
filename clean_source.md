Baseline Clean Source Code Specifications (Disintegrated State)
This document contains the baseline storefront codebase architecture. Overwriting the files with these code blocks will completely disintegrate the BargainBaaS SDK, removing all parameters, hooks, script bundles, and verification proxies.

================================================================================================================================================================
1. Global Store Map: src/store/cartStore.ts

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
}

interface CartStore {
  items: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  cartTotal: () => number;
  cartCount: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addToCart: (product) => {
        const finalPrice = product.originalPrice;
        set((state) => {
          const existing = state.items.find((item) => item.id === product.id);
          if (existing) {
            return {
              items: state.items.map((item) =>
                item.id === product.id
                  ? { ...item, quantity: item.quantity + 1 }
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

================================================================================================================================================================

2. Product Detail Mapping: src/pages/product/[id].tsx:

import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { products } from '@/data/products';
import { useCartStore } from '@/store/cartStore';
import { ShoppingCart, ArrowLeft, Check } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

export default function ProductPage() {
  const router = useRouter();
  const { id } = router.query;
  const addToCart = useCartStore((s) => s.addToCart);
  const [added, setAdded] = useState(false);

  const product = products.find((p) => p.id === id);

  const handleAddToCart = () => {
    addToCart(product!);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (router.isFallback || !id) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Product Not Found</h1>
        <Link href="/" className="text-indigo-600 hover:underline flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Catalog
        </Link>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{product.name} | TechStore</title>
        <meta name="description" content={product.shortDescription} />
      </Head>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          <div className="relative aspect-square bg-slate-50 rounded-3xl overflow-hidden border border-slate-100 shadow-sm">
            <Image src={product.imageUrl} alt={product.name} fill className="object-contain p-10" priority />
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-sm font-semibold text-indigo-500 uppercase tracking-widest mb-2">{product.category}</span>
            <h1 className="text-4xl font-extrabold text-slate-900 mb-3 leading-tight">{product.name}</h1>
            <p className="text-slate-500 text-lg mb-6 leading-relaxed">{product.shortDescription}</p>
            <div className="border-t border-slate-100 my-6" />
            <p className="text-slate-600 leading-relaxed mb-8">{product.description}</p>

            <div className="flex items-baseline gap-3 mb-8">
              <span className="text-4xl font-extrabold text-slate-900">Rs {product.originalPrice.toLocaleString('en-PK')}</span>
              <span className="text-slate-400 text-sm font-medium">PKR</span>
            </div>

            <button
              id={`add-to-cart-${product.id}`}
              onClick={handleAddToCart}
              className={`flex items-center justify-center gap-3 w-full py-4 rounded-2xl text-base font-bold transition-all duration-300 shadow-lg cursor-pointer ${
                added ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:shadow-xl hover:-translate-y-0.5'
              }`}
            >
              {added ? (
                <><Check className="w-5 h-5" /> Added to Cart!</>
              ) : (
                <><ShoppingCart className="w-5 h-5" /> Add to Cart <span className="text-indigo-200 text-sm font-medium">Rs {product.originalPrice.toLocaleString('en-PK')}</span></>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

================================================================================================================================================================

3. Shopping Basket Module: src/pages/cart.tsx:

import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCartStore } from '@/store/cartStore';
import { Trash2, ShoppingBag, ArrowRight } from 'lucide-react';

export default function CartPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const cartTotal = useCartStore((s) => s.cartTotal());
  const removeFromCart = useCartStore((s) => s.removeFromCart);

  return (
    <>
      <Head>
        <title>Cart | TechStore</title>
      </Head>
      <div className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-6">Shopping Cart</h1>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-6">
            <ShoppingBag className="w-10 h-10 text-indigo-400" />
            <h2 className="text-xl font-bold text-slate-800">Your cart is empty</h2>
            <Link href="/" className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold">Continue Shopping</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => {
                return (
                  <div key={item.id} className="flex items-center gap-5 bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                    <div className="relative w-20 h-20 bg-slate-50 rounded-xl overflow-hidden">
                      <Image src={item.imageUrl} alt={item.name} fill className="object-contain p-2" sizes="80px" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 text-sm">{item.name}</h3>
                      <p className="text-slate-500 text-xs">Qty: {item.quantity}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="font-extrabold text-slate-900">Rs {item.finalPrice.toLocaleString('en-PK')}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900 text-sm">Rs {(item.finalPrice * item.quantity).toLocaleString('en-PK')}</p>
                      <button onClick={() => removeFromCart(item.id)} className="mt-2 text-slate-400 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl border border-slate-100 p-6 sticky top-24 shadow-sm">
                <h2 className="font-bold text-slate-900 text-lg mb-6">Order Summary</h2>
                <div className="border-t border-slate-100 pt-4 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900">Total</span>
                    <span className="font-extrabold text-slate-900 text-xl">Rs {cartTotal.toLocaleString('en-PK')}</span>
                  </div>
                </div>

                <button
                  id="proceed-to-checkout"
                  onClick={() => router.push('/checkout')}
                  className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-base shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
                >
                  Proceed to Checkout <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

================================================================================================================================================================

4. Cryptographic Handshake Gateway: src/pages/api/verify-deal.ts:

import type { NextApiRequest, NextApiResponse } from 'next';

type VerifyErrorResponse = { verified: false; error: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<VerifyErrorResponse>) {
  return res.status(404).json({ 
    verified: false, 
    error: 'BargainBaaS verification engine is currently disconnected from this storefront cluster.' 
  });
}

================================================================================
