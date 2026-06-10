# Complete Integrated Source Code Specifications

This document lists the finalized codebase architecture configurations for the four target system layers with the BargainBaaS integration paths compiled inline.

==========================================================================================================================

### 1. Global Store Map: `src/store/cartStore.ts`
```typescript

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


==========================================================================================================================

2. Product Detail Mapping: src/pages/product/[id].tsx:

import Head from 'next/head';
import Image from 'next/image';
import Script from 'next/script';
import { useRouter } from 'next/router';
import { products } from '@/data/products';
import { useCartStore } from '@/store/cartStore';
import { ShoppingCart, ArrowLeft, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';

// === BARGAIN_BAAS_INTEGRATION_START ===
// Extend Window so TypeScript knows about window.INA method bindings
declare global {
  interface Window {
    INA?: (...args: unknown[]) => void;
  }
}
// === BARGAIN_BAAS_INTEGRATION_END ===

export default function ProductPage() {
  const router = useRouter();
  const { id } = router.query;
  const addToCart = useCartStore((s) => s.addToCart);
  const [added, setAdded] = useState(false);

  // === BARGAIN_BAAS_INTEGRATION_START ===
  // BargainBaaS negotiation state parameters
  const [negotiatedPrice, setNegotiatedPrice] = useState<number | null>(null);
  const [negotiationSessionId, setNegotiationSessionId] = useState<string | null>(null);
  // === BARGAIN_BAAS_INTEGRATION_END ===

  const product = products.find((p) => p.id === id);

  // === BARGAIN_BAAS_INTEGRATION_START ===
  // Effect 1: Reset negotiation state when the product changes to avoid state leakages
  useEffect(() => {
    setNegotiatedPrice(null);
    setNegotiationSessionId(null);
    setAdded(false);
  }, [id]);

  // Effect 2: Signal the BargainBaaS widget when this product page mounts
  useEffect(() => {
    if (!product) return;
    if (typeof window !== 'undefined' && typeof window.INA === 'function') {
      window.INA('product-change', { productId: product?.id });
    }
  }, [product?.id]);

  // Effect 3: postMessage bridge: receive negotiated price metrics safely from widget runtime
  useEffect(() => {
    if (!product) return;
    function handleINAMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || data.source !== 'ina-widget') return;
      if (data.type !== 'BARGAIN_BAAS_SUCCESS') return;
      if (data.productId !== product?.id) return;

      const agreedPrice = data.finalPrice ?? data.price;
      const sessionId = data.sessionId;
      if (!agreedPrice || !sessionId) return;

      setNegotiatedPrice(agreedPrice);
      setNegotiationSessionId(sessionId);
    }
    window.addEventListener('message', handleINAMessage);
    return () => window.removeEventListener('message', handleINAMessage);
  }, [product]);
  // === BARGAIN_BAAS_INTEGRATION_END ===

  const handleAddToCart = () => {
    addToCart(
      product!,
      // === BARGAIN_BAAS_INTEGRATION_START ===
      negotiatedPrice ?? undefined,
      negotiationSessionId ?? undefined
      // === BARGAIN_BAAS_INTEGRATION_END ===
    );
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

      {/* === BARGAIN_BAAS_INTEGRATION_START === */}
      <Script
        src={process.env.NEXT_PUBLIC_INA_CDN_URL}
        data-ina-tenant={process.env.NEXT_PUBLIC_INA_PUBLIC_KEY}
        data-ina-product={product?.id}
        data-ina-product-route="/product/:id"
        strategy="afterInteractive"
      />
      {/* === BARGAIN_BAAS_INTEGRATION_END === */}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <nav className="mb-8 flex items-center gap-2 text-sm text-slate-500">
          <Link href="/" className="hover:text-indigo-600 transition-colors">Home</Link>
          <span>/</span>
          <span className="text-slate-400">{product.category}</span>
          <span>/</span>
          <span className="text-slate-800 font-medium">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          <div className="relative aspect-square bg-slate-50 rounded-3xl overflow-hidden border border-slate-100 shadow-sm">
            {product.badge && (
              <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-indigo-600 text-white text-sm font-bold z-10">
                {product.badge}
              </span>
            )}
            <Image src={product.imageUrl} alt={product.name} fill className="object-contain p-10" priority sizes="(max-width: 1024px) 100vw, 50vw" />
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
            <Link href="/cart" className="mt-4 text-center text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors underline-offset-4 hover:underline">
              View Cart
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

==========================================================================================================================

3. Shopping Basket Module: src/pages/cart.tsx

import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCartStore } from '@/store/cartStore';
import { Trash2, ShoppingBag, ArrowRight, AlertTriangle, Loader2 } from 'lucide-react';
import { useState } from 'react';

export default function CartPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const cartTotal = useCartStore((s) => s.cartTotal());
  const removeFromCart = useCartStore((s) => s.removeFromCart);

  // === BARGAIN_BAAS_INTEGRATION_START ===
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  async function handleCheckout() {
    setVerifyError(null);
    setIsVerifying(true);
    const negotiatedItems = items.filter((item) => item.sessionId);

    for (const item of negotiatedItems) {
      try {
        const res = await fetch('/api/verify-deal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: item.sessionId,
            productId: item.id,
            finalPrice: item.finalPrice,
          }),
        });
        const data = await res.json();
        if (!data.verified) {
          setVerifyError(`Price validation failed for "${item.name}". Please renegotiate before checking out.`);
          setIsVerifying(false);
          return;
        }
      } catch {
        setVerifyError(`Could not verify the negotiated price for "${item.name}". Check connection and try again.`);
        setIsVerifying(false);
        return;
      }
    }
    setIsVerifying(false);
    router.push('/checkout');
  }
  // === BARGAIN_BAAS_INTEGRATION_END ===

  return (
    <>
      <Head>
        <title>Cart | TechStore</title>
      </Head>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Shopping Cart</h1>
        <p className="text-slate-500 mb-10">
          {items.length === 0 ? 'Your cart is empty.' : `${items.length} item${items.length > 1 ? 's' : ''} in your cart`}
        </p>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-6">
            <div className="w-24 h-24 rounded-full bg-indigo-50 flex items-center justify-center">
              <ShoppingBag className="w-10 h-10 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Your cart is empty</h2>
              <p className="text-slate-500">Looks like you haven't added anything yet.</p>
            </div>
            <Link href="/" className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold hover:shadow-lg transition-all">
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => {
                const isNegotiated = item.finalPrice < item.originalPrice;
                return (
                  <div key={item.id} className="flex items-center gap-5 bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="relative w-20 h-20 flex-shrink-0 bg-slate-50 rounded-xl overflow-hidden border border-slate-100">
                      <Image src={item.imageUrl} alt={item.name} fill className="object-contain p-2" sizes="80px" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 text-sm truncate">{item.name}</h3>
                      <p className="text-slate-500 text-xs mt-0.5">Qty: {item.quantity}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="font-extrabold text-slate-900">Rs {item.finalPrice.toLocaleString('en-PK')}</span>
                        {isNegotiated && (
                          <>
                            <span className="text-slate-400 text-xs line-through">Rs {item.originalPrice.toLocaleString('en-PK')}</span>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">Negotiated!</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-slate-900 text-sm">Rs {(item.finalPrice * item.quantity).toLocaleString('en-PK')}</p>
                      <button onClick={() => removeFromCart(item.id)} className="mt-2 p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer" aria-label={`Remove ${item.name}`}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl border border-slate-100 p-6 sticky top-24 shadow-sm">
                <h2 className="font-bold text-slate-900 text-lg mb-6">Order Summary</h2>
                <div className="space-y-3 mb-6">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-slate-500 truncate max-w-[60%]">{item.name} x{item.quantity}</span>
                      <span className="font-medium text-slate-800">Rs {(item.finalPrice * item.quantity).toLocaleString('en-PK')}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-100 pt-4 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900规格 text-base">Total</span>
                    <span className="font-extrabold text-slate-900 text-xl">Rs {cartTotal.toLocaleString('en-PK')}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Inclusive of all taxes</p>
                </div>

                {/* === BARGAIN_BAAS_INTEGRATION_START === */}
                {verifyError && (
                  <div role="alert" className="flex items-start gap-2.5 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 mb-4 text-sm text-rose-700">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-500" />
                    <span>{verifyError}</span>
                  </div>
                )}
                {/* === BARGAIN_BAAS_INTEGRATION_END === */}

                <button
                  id="proceed-to-checkout"
                  // === BARGAIN_BAAS_INTEGRATION_START ===
                  onClick={handleCheckout}
                  disabled={isVerifying}
                  // === BARGAIN_BAAS_INTEGRATION_END ===
                  className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-base shadow-lg transition-all duration-300 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-xl hover:-translate-y-0.5"
                >
                  {/* === BARGAIN_BAAS_INTEGRATION_START === */}
                  {isVerifying ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Verifying prices...</>
                  ) : (
                    <>Proceed to Checkout <ArrowRight className="w-4 h-4" /></>
                  )}
                  {/* === BARGAIN_BAAS_INTEGRATION_END === */}
                </button>
                <Link href="/" className="block text-center mt-4 text-sm text-slate-500 hover:text-indigo-600 transition-colors underline-offset-4 hover:underline">
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

==========================================================================================================================

4. Cryptographic Handshake Gateway: src/pages/api/verify-deal.ts:

import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

type VerifySuccessResponse = { verified: true; sessionId: string; productId: string; finalPrice: number };
type VerifyErrorResponse = { verified: false; error: string };
type VerifyResponse = VerifySuccessResponse | VerifyErrorResponse;

export default async function handler(req: NextApiRequest, res: NextApiResponse<VerifyResponse>) {
  // === BARGAIN_BAAS_INTEGRATION_START ===
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ verified: false, error: 'Method Not Allowed' });
  }

  const { sessionId, productId, finalPrice } = req.body ?? {};
  if (!sessionId || !productId || finalPrice === undefined || finalPrice === null) {
    return res.status(400).json({ verified: false, error: 'Missing required parameters: sessionId, productId, finalPrice' });
  }

  const webhookSecret = process.env.INA_WEBHOOK_SECRET;
  const tenantId = process.env.INA_TENANT_ID;
  const verifyUrl = process.env.INA_VERIFY_URL || 'https://ina-backend-fyp.onrender.com/api/saas/session/verify';

  if (!webhookSecret || !tenantId) {
    return res.status(500).json({ verified: false, error: 'Upstream microservice configuration keys missing' });
  }

  const body = JSON.stringify({ session_id: sessionId, final_price: Number(finalPrice) });
  const timestamp = Date.now().toString();
  const signature = crypto.createHmac('sha256', webhookSecret).update(`${timestamp}.${body}`).digest('hex');

  try {
    const inaResponse = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-INA-Tenant': tenantId,
        'X-INA-Timestamp': timestamp,
        'X-INA-Signature': signature,
      },
      body,
    });

    if (!inaResponse.ok) {
      return res.status(422).json({ verified: false, error: 'Upstream HMAC validation rejected request' });
    }

    const inaData = await inaResponse.json();
    if (!inaData?.valid) {
      return res.status(422).json({ verified: false, error: 'Price signature token mapping validation mismatch' });
    }

    return res.status(200).json({ verified: true, sessionId: String(sessionId), productId: String(productId), finalPrice: Number(finalPrice) });
  } catch (err) {
    return res.status(502).json({ verified: false, error: 'Failed to reach central BargainBaaS verification runtime' });
  }
  // === BARGAIN_BAAS_INTEGRATION_END ===
}