import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { Navbar } from '@/components/navbar';
import { Sidebar } from '@/components/sidebar';
import { BottomNav } from '@/components/bottom-nav';
import { PwaInstallPrompt } from '@/components/pwa-install-prompt';

export const metadata: Metadata = {
  title: 'The Dagmawi Dispatch — Royal Broadsheet & Telegram Chronicle',
  description: 'An avant-garde archival publication and teleprinter feed of high-frequency Telegram dispatches with AI editorial synthesis.',
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
  themeColor: '#0c0d10',
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
      <body className="min-h-screen bg-[#0c0d10] text-[#f4f0e6] antialiased selection:bg-[#d97706] selection:text-black">
        <Providers>
          {/* Top Broadsheet Bulletin Line */}
          <div className="w-full bg-[#161822] border-b border-[#262936] py-1 px-4 text-center font-teletype text-[10px] tracking-widest text-[#a39e93] uppercase flex items-center justify-between">
            <span className="hidden sm:inline">✦ VOL. 2026 · NO. 88</span>
            <span>THE ROYAL ARCHIVE · TELEGRAM CORE INGESTION ACTIVE</span>
            <span className="hidden sm:inline">PRICE: GRATIS ✦</span>
          </div>

          <div className="relative flex flex-col min-h-screen max-w-7xl mx-auto border-x border-[#262936]">
            <Navbar />
            <div className="flex-1 w-full flex">
              <Sidebar />
              <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-12 bg-[#0e1015]">
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
