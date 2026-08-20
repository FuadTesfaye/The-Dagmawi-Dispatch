import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { Navbar } from '@/components/navbar';
import { BottomNav } from '@/components/bottom-nav';
import { PwaInstallPrompt } from '@/components/pwa-install-prompt';

export const metadata: Metadata = {
  title: 'The Lurkening — Royal Broadsheet & Telegram Chronicle',
  description: 'Universal Telegram channel monitoring, Groq AI editorial intelligence, and multi-channel discovery.',
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
  viewportFit: 'cover',
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
          <div className="w-full bg-[#12141c] border-b border-[#262936] py-1 px-3 sm:px-4 text-center font-teletype text-[9px] sm:text-[10px] tracking-wider sm:tracking-widest text-[#a39e93] uppercase flex items-center justify-between overflow-hidden shrink-0">
            <span className="hidden sm:inline">✦ VOL. 2026 · NO. 88</span>
            <div className="flex items-center gap-1.5 mx-auto sm:mx-0 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="truncate">THE LURKENING · TELEGRAM AI WIRE INDEX</span>
            </div>
            <span className="hidden sm:inline">REAL-TIME INGESTION ✦</span>
          </div>

          <div className="min-h-screen flex flex-col">
            <Navbar />

            {/* Expansive Content Canvas with safe area bottom padding on mobile */}
            <main className="flex-1 w-full pb-24 lg:pb-12 pt-2 sm:pt-4">
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
