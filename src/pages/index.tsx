import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { products } from '@/data/products';
import { ArrowRight, Star, Shield, Truck, Headphones } from 'lucide-react';

export default function HomePage() {
  return (
    <>
      <Head>
        <title>TechStore – Premium Tech Products in Pakistan</title>
        <meta
          name="description"
          content="Shop the latest iPhones, MacBooks, Sony headphones, PlayStation consoles and more at TechStore. Best prices in Pakistan."
        />
      </Head>

      {/* ─── Hero Section ─── */}
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-violet-50 pointer-events-none" />

        {/* Decorative blobs */}
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-indigo-100 opacity-40 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-violet-100 opacity-40 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 text-center">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            Pakistan&apos;s Premier Tech Destination
          </span>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-6">
            Welcome to{' '}
            <span className="gradient-text">TechStore</span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-500 mb-10 leading-relaxed">
            Discover the latest smartphones, laptops, audio gear, and gaming consoles.
            Authentic products, competitive prices, delivered to your door.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#catalog"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold text-base shadow-lg hover:shadow-indigo-300 hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
            >
              Shop Now
              <ArrowRight className="w-4 h-4" />
            </a>
            <Link
              href="/cart"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl border-2 border-slate-200 text-slate-700 font-semibold text-base hover:border-indigo-300 hover:text-indigo-600 transition-all duration-300"
            >
              View Cart
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {[
              { icon: Shield, label: '100% Authentic' },
              { icon: Truck, label: 'Nationwide Delivery' },
              { icon: Headphones, label: '24/7 Support' },
              { icon: Star, label: '4.9 Star Rating' },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/60 backdrop-blur border border-slate-100 shadow-sm"
              >
                <Icon className="w-5 h-5 text-indigo-600" />
                <span className="text-xs font-medium text-slate-600">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Product Catalog ─── */}
      <section id="catalog" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="mb-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
            Featured Products
          </h2>
          <p className="text-slate-500 text-lg">
            Hand-picked tech for every lifestyle and budget
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="card-hover bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm flex flex-col"
            >
              {/* Product Image */}
              <div className="relative aspect-square bg-slate-50 p-6">
                {product.badge && (
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-indigo-600 text-white text-xs font-bold z-10">
                    {product.badge}
                  </span>
                )}
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  fill
                  className="object-contain p-4"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
              </div>

              {/* Product Info */}
              <div className="flex flex-col flex-1 p-5">
                <span className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-1">
                  {product.category}
                </span>
                <h3 className="font-bold text-slate-900 text-base mb-1 leading-tight">
                  {product.name}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-4 flex-1">
                  {product.shortDescription}
                </p>

                <div className="flex items-center justify-between mt-auto">
                  <span className="text-lg font-extrabold text-slate-900">
                    Rs {product.originalPrice.toLocaleString('en-PK')}
                  </span>
                  <Link
                    href={`/product/${product.id}`}
                    id={`view-product-${product.id}`}
                    className="px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-sm font-semibold hover:bg-indigo-600 hover:text-white transition-all duration-200"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
