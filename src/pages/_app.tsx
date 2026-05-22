import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import Layout from '@/components/Layout';
import { Geist } from 'next/font/google';

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div className={`${geistSans.variable} font-sans`}>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </div>
  );
}
