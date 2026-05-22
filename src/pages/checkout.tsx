import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCartStore } from '@/store/cartStore';
import { CheckCircle, Home, Package } from 'lucide-react';

export default function CheckoutPage() {
  const clearCart = useCartStore((s) => s.clearCart);
  const cartTotal = useCartStore((s) => s.cartTotal());
  const [finalTotal, setFinalTotal] = useState<number>(0);

  useEffect(() => {
    // Capture the total before clearing
    setFinalTotal(cartTotal);
    clearCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Head>
        <title>Order Confirmed – TechStore</title>
        <meta name="description" content="Your TechStore order has been placed successfully." />
      </Head>

      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-lg w-full text-center">
          {/* Success Icon */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="w-28 h-28 rounded-full bg-emerald-50 flex items-center justify-center">
                <CheckCircle className="w-14 h-14 text-emerald-500" />
              </div>
              {/* Ripple effect */}
              <div className="absolute inset-0 rounded-full bg-emerald-400 opacity-20 animate-ping" />
            </div>
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">
            Order Confirmed! 🎉
          </h1>

          <p className="text-slate-500 text-lg mb-2 leading-relaxed">
            Thank you for your order!
          </p>

          {finalTotal > 0 && (
            <div className="my-6 px-6 py-4 rounded-2xl bg-emerald-50 border border-emerald-100 inline-block">
              <p className="text-slate-600 text-sm mb-1">Total Amount Paid</p>
              <p className="text-3xl font-extrabold text-emerald-700">
                Rs {finalTotal.toLocaleString('en-PK')}
              </p>
              <p className="text-xs text-emerald-600 mt-1">Your purchase was successful</p>
            </div>
          )}

          <p className="text-slate-400 text-sm mt-4 mb-10">
            A confirmation email has been sent to your registered address.
            <br />
            Estimated delivery: <span className="font-semibold text-slate-600">3–5 business days</span>
          </p>

          {/* Order details card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-8 text-left">
            <div className="flex items-center gap-3 mb-4">
              <Package className="w-5 h-5 text-indigo-600" />
              <span className="font-bold text-slate-800">What happens next?</span>
            </div>
            <ol className="space-y-3 text-sm text-slate-500">
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  1
                </span>
                Your order has been received and is being processed.
              </li>
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  2
                </span>
                We&apos;ll notify you once your package is shipped.
              </li>
              <li className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  3
                </span>
                Delivery in 3–5 business days across Pakistan.
              </li>
            </ol>
          </div>

          <Link
            href="/"
            id="back-to-home"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-base shadow-lg hover:shadow-indigo-300 hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
          >
            <Home className="w-4 h-4" />
            Back to Store
          </Link>
        </div>
      </div>
    </>
  );
}
