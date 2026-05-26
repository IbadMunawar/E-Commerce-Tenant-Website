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

  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  /**
   * Loops through every cart item that carries a BargainBaaS sessionId and
   * fires a POST to our local /api/verify-deal proxy for each one.
   * The proxy performs the HMAC-SHA256 handshake with the INA backend.
   * If ANY item fails verification the loop aborts, an error banner is shown,
   * and the router.push to /checkout is never called.
   */
  async function handleCheckout() {
    // Reset any previous error and enter loading state
    setVerifyError(null);
    setIsVerifying(true);

    // Isolate items that were bargained via the INA widget
    const negotiatedItems = items.filter((item) => item.sessionId);

    // Sequential loop — we stop at the first failure rather than firing all
    // requests in parallel, so the error message can name the specific item.
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
          // Verification rejected — surface the error and halt checkout
          setVerifyError(
            `Price validation failed for "${item.name}". Please renegotiate before checking out.`
          );
          setIsVerifying(false);
          return;
        }
      } catch {
        // Network or parse error reaching our own API route
        setVerifyError(
          `Could not verify the negotiated price for "${item.name}". Check your connection and try again.`
        );
        setIsVerifying(false);
        return;
      }
    }

    // All negotiated items passed — safe to proceed
    setIsVerifying(false);
    router.push('/checkout');
  }

  return (
    <>
      <Head>
        <title>Cart – TechStore</title>
        <meta name="description" content="Review your cart and proceed to checkout." />
      </Head>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Shopping Cart</h1>
        <p className="text-slate-500 mb-10">
          {items.length === 0
            ? 'Your cart is empty.'
            : `${items.length} item${items.length > 1 ? 's' : ''} in your cart`}
        </p>

        {items.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-24 text-center gap-6">
            <div className="w-24 h-24 rounded-full bg-indigo-50 flex items-center justify-center">
              <ShoppingBag className="w-10 h-10 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">
                Your cart is empty
              </h2>
              <p className="text-slate-500">
                Looks like you haven&apos;t added anything yet.
              </p>
            </div>
            <Link
              href="/"
              id="continue-shopping"
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold hover:shadow-lg hover:shadow-indigo-200 transition-all duration-300 hover:-translate-y-0.5"
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => {
                const isNegotiated = item.finalPrice < item.originalPrice;
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-5 bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200"
                  >
                    {/* Image */}
                    <div className="relative w-20 h-20 flex-shrink-0 bg-slate-50 rounded-xl overflow-hidden border border-slate-100">
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        className="object-contain p-2"
                        sizes="80px"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 text-sm truncate">
                        {item.name}
                      </h3>
                      <p className="text-slate-500 text-xs mt-0.5">
                        Qty: {item.quantity}
                      </p>

                      {/* Price display */}
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-sm">
                          Rs {item.finalPrice.toLocaleString('en-PK')}
                        </span>
                        {isNegotiated && (
                          <>
                            <span className="text-slate-400 text-xs line-through">
                              Rs {item.originalPrice.toLocaleString('en-PK')}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                              Negotiated!
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Per-item subtotal */}
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-slate-900 text-sm">
                        Rs {(item.finalPrice * item.quantity).toLocaleString('en-PK')}
                      </p>
                      <button
                        id={`remove-${item.id}`}
                        onClick={() => removeFromCart(item.id)}
                        className="mt-2 p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors duration-200 cursor-pointer"
                        aria-label={`Remove ${item.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sticky top-24">
                <h2 className="font-bold text-slate-900 text-lg mb-6">Order Summary</h2>

                <div className="space-y-3 mb-6">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-slate-500 truncate max-w-[60%]">
                        {item.name} ×{item.quantity}
                      </span>
                      <span className="font-medium text-slate-800">
                        Rs {(item.finalPrice * item.quantity).toLocaleString('en-PK')}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-100 pt-4 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900 text-base">Total</span>
                    <span className="font-extrabold text-slate-900 text-xl">
                      Rs {cartTotal.toLocaleString('en-PK')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Inclusive of all taxes</p>
                </div>

                {/* Verification error banner — shown only when a deal check fails */}
                {verifyError && (
                  <div
                    role="alert"
                    className="flex items-start gap-2.5 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 mb-4 text-sm text-rose-700"
                  >
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-500" />
                    <span>{verifyError}</span>
                  </div>
                )}

                <button
                  id="proceed-to-checkout"
                  onClick={handleCheckout}
                  disabled={isVerifying}
                  className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-base shadow-lg transition-all duration-300 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0 hover:shadow-indigo-300 hover:shadow-xl hover:-translate-y-0.5"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying prices…
                    </>
                  ) : (
                    <>
                      Proceed to Checkout
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <Link
                  href="/"
                  className="block text-center mt-4 text-sm text-slate-500 hover:text-indigo-600 transition-colors underline-offset-4 hover:underline"
                >
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
