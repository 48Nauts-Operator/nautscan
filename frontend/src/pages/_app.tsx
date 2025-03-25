import { AppProps } from 'next/app';
import '@/styles/globals.css';
import { Inter, Space_Mono } from 'next/font/google';
import Head from 'next/head';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const spaceMono = Space_Mono({ 
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-space-mono'
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>NautScan - Network Intelligence</title>
        <meta name="description" content="Advanced network traffic analysis and visualization" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <main className={`${inter.variable} ${spaceMono.variable} font-sans bg-background text-foreground`}>
        <Component {...pageProps} />
      </main>
    </>
  );
} 