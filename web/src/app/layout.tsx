import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { Navbar } from '@/components/navbar';
import { Sidebar } from '@/components/sidebar';
import { BottomNav } from '@/components/bottom-nav';
import { PwaInstallPrompt } from '@/components/pwa-install-prompt';

export const metadata: Metadata = {
  title: 'The Dagmawi Dispatch — Telegram Publication & Scribe Feed',
  description: 'Clean, real-time Telegram publication feed with multi-channel indexing and AI-powered editorial synthesis.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Dagmawi Dispatch',
  },
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  themeColor: '#090a0f',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#090a0f] text-zinc-100 antialiased selection:bg-zinc-800 selection:text-white">
        <Providers>
          <div className="relative flex flex-col min-h-screen">
            <Navbar />
            <div className="flex-1 max-w-6xl w-full mx-auto flex">
              <Sidebar />
              <main className="flex-1 min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 pb-24 lg:pb-12">
                {children}
              </main>
            </div>
            <BottomNav />
            <PwaInstallPrompt />
          </div>
        </Providers>
      </body>
    </html>
  );
}
