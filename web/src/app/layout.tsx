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
  themeColor: '#040508',
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
      <body className="min-h-screen ambient-mesh-bg text-zinc-100 antialiased selection:bg-amber-500/30 selection:text-amber-200">
        <Providers>
          {/* Animated Ambient Light Orbs */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
            <div className="absolute top-[-10%] left-[10%] w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[150px] animate-orb-float" />
            <div className="absolute top-[45%] right-[5%] w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[160px] animate-orb-float" style={{ animationDelay: '4s' }} />
            <div className="absolute bottom-[-10%] left-[30%] w-[550px] h-[550px] bg-amber-400/5 rounded-full blur-[140px] animate-orb-float" style={{ animationDelay: '8s' }} />
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
