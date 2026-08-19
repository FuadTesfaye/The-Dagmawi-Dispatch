import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { Navbar } from '@/components/navbar';
import { Sidebar } from '@/components/sidebar';
import { BottomNav } from '@/components/bottom-nav';
import { PwaInstallPrompt } from '@/components/pwa-install-prompt';

export const metadata: Metadata = {
  title: 'The Dagmawi Dispatch — Royal Telegram Platform',
  description: 'Telegram channels aggregated, summarized by AI, and served with royal heraldry and real-time community commentary.',
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
  themeColor: '#08090d',
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
      <body className="min-h-screen bg-[#08090d] text-zinc-100 antialiased selection:bg-amber-500/30 selection:text-amber-200">
        <Providers>
          {/* Ambient Glows */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
            <div className="absolute top-[-10%] left-[15%] w-[500px] h-[500px] bg-amber-600/10 rounded-full blur-[140px] mix-blend-screen animate-subtle-glow" />
            <div className="absolute top-[40%] right-[10%] w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-[120px] mix-blend-screen" />
          </div>

          <div className="relative z-10 flex flex-col min-h-screen">
            <Navbar />
            <div className="flex-1 max-w-7xl w-full mx-auto flex">
              <Sidebar />
              <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-12">
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
