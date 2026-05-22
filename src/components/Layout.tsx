import React from 'react';
import Navbar from './Navbar';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main>{children}</main>
      <footer className="mt-20 border-t border-slate-100 bg-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-slate-400">
            © 2025 TechStore Dummy &mdash; A demo storefront for BargainBaaS FYDP presentation.
          </p>
        </div>
      </footer>
    </div>
  );
}
