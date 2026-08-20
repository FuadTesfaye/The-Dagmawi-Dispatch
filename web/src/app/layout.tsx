import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { Navbar } from '@/components/navbar';
import { Sidebar } from '@/components/sidebar';
import { BottomNav } from '@/components/bottom-nav';
import { PwaInstallPrompt } from '@/components/pwa-install-prompt';

export const metadata: Metadata = {
  title: 'The Lurkening — Royal Broadsheet & Telegram Chronicle',
  description: 'An avant-garde archival publication and teleprinter feed of high-frequency Telegram dispatches with AI editorial synthesis.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'The Lurkening',
  },
  openGraph: {
    title: 'The Lurkening',
    description: 'The Royal Telegram Broadsheet & AI Editorial Chronicle',
    type: 'website',
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
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full">
      <body className="min-h-full bg-[#0c0d10] text-[#f4f0e6] font-sans antialiased selection:bg-[#d97706] selection:text-black">
        <Providers>
          {/* Broadsheet Top Bulletin Banner */}
          <div className="w-full bg-[#161822] border-b border-[#262936] py-1.5 px-4 text-center font-teletype text-[10px] tracking-widest text-[#a39e93] uppercase flex items-center justify-between">
            <span className="hidden sm:inline">✦ VOL. 2026 · NO. 88</span>
            <span>THE LURKENING · ROYAL ARCHIVE & TELEGRAM INDEX</span>
            <span className="hidden sm:inline">REAL-TIME INGESTION ✦</span>
          </div>

          <div className="min-h-screen flex flex-col">
            <Navbar />

            {/* Expansive Fullscreen Content Canvas */}
            <main className="flex-1 w-full pb-20 md:pb-12">
              {children}
            </main>

            <BottomNav />
            <PwaInstallPrompt />
          </div>
        </Providers>
      </body>
    </html>
  );
}
