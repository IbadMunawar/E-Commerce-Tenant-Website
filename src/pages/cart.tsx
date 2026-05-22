import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useCartStore } from '@/store/cartStore';
import { Trash2, ShoppingBag, ArrowRight } from 'lucide-react';

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const cartTotal = useCartStore((s) => s.cartTotal());
  const removeFromCart = useCartStore((s) => s.removeFromCart);

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

                <Link
                  href="/checkout"
                  id="proceed-to-checkout"
                  className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-base shadow-lg hover:shadow-indigo-300 hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                >
                  Proceed to Checkout
                  <ArrowRight className="w-4 h-4" />
                </Link>

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
