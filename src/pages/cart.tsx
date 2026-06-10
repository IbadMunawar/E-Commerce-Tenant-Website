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
