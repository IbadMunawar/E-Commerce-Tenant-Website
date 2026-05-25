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


  const handleAddToCart = () => {
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };


  return (
    <>
      <Head>
        <title>{product.name} – TechStore</title>
        <meta name="description" content={product.shortDescription} />
      </Head>


      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-2 text-sm text-slate-500">
          <Link href="/" className="hover:text-indigo-600 transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-slate-400">{product.category}</span>
          <span>/</span>
          <span className="text-slate-800 font-medium">{product.name}</span>
        </nav>


        {/* Product Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Left: Image */}
          <div className="relative aspect-square bg-slate-50 rounded-3xl overflow-hidden border border-slate-100 shadow-sm">
            {product.badge && (
              <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-indigo-600 text-white text-sm font-bold z-10">
                {product.badge}
              </span>
            )}
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-contain p-10"
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>


          {/* Right: Info */}
          <div className="flex flex-col justify-center">
            <span className="text-sm font-semibold text-indigo-500 uppercase tracking-widest mb-2">
              {product.category}
            </span>


            <h1 className="text-4xl font-extrabold text-slate-900 mb-3 leading-tight">
              {product.name}
            </h1>
            <p className="text-slate-500 text-lg mb-6 leading-relaxed">
              {product.shortDescription}
            </p>


            {/* Divider */}
            <div className="border-t border-slate-100 my-6" />


            <p className="text-slate-600 leading-relaxed mb-8">
              {product.description}
            </p>


            {/* Price */}
            <div className="flex items-baseline gap-3 mb-8">
              <span className="text-4xl font-extrabold text-slate-900">
                Rs {product.originalPrice.toLocaleString('en-PK')}
              </span>
              <span className="text-slate-400 text-sm font-medium">PKR</span>
            </div>


            {/* Add to Cart Button */}
            <button
              id={`add-to-cart-${product.id}`}
              onClick={handleAddToCart}
              className={`flex items-center justify-center gap-3 w-full py-4 rounded-2xl text-base font-bold transition-all duration-300 shadow-lg cursor-pointer ${added
                ? 'bg-emerald-500 text-white shadow-emerald-200'
                : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:shadow-indigo-300 hover:shadow-xl hover:-translate-y-0.5'
                }`}
            >
              {added ? (
                <>
                  <Check className="w-5 h-5" /> Added to Cart!
                </>
              ) : (
                <>
                  <ShoppingCart className="w-5 h-5" /> Add to Cart
                  <span className="text-indigo-200 text-sm font-medium">
                    – Rs {product.originalPrice.toLocaleString('en-PK')}
                  </span>
                </>
              )}
            </button>


            {/* View Cart Link */}
            <Link
              href="/cart"
              className="mt-4 text-center text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors underline-offset-4 hover:underline"
            >
              View Cart
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
