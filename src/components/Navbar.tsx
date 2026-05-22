'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useCartStore } from '@/store/cartStore';
import { ShoppingCart, Zap } from 'lucide-react';

export default function Navbar() {
  const cartCount = useCartStore((s) => s.cartCount());
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-lg flex items-center justify-center shadow-md group-hover:shadow-indigo-200 transition-shadow duration-300">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-800">
              Tech<span className="text-indigo-600">Store</span>
            </span>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/"
              className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors duration-200"
            >
              Catalog
            </Link>
            <Link
              href="/cart"
              className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors duration-200"
            >
              Cart
            </Link>
          </nav>

          {/* Cart Icon */}
          <Link
            href="/cart"
            id="cart-icon-link"
            className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-indigo-50 transition-colors duration-200 group"
            aria-label="Shopping Cart"
          >
            <ShoppingCart className="w-5 h-5 text-slate-700 group-hover:text-indigo-600 transition-colors duration-200" />
            {isMounted && cartCount > 0 && (
              <span
                key={cartCount}
                className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 text-white text-xs font-bold rounded-full flex items-center justify-center animate-bounce-once shadow-md"
              >
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
