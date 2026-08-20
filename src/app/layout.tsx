import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { Navbar } from '@/components/navbar';
import { BottomNav } from '@/components/bottom-nav';
import { PwaInstallPrompt } from '@/components/pwa-install-prompt';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://thelurkening.com';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'The Lurkening — Royal Telegram Broadsheet & Groq AI Intelligence',
    template: '%s | The Lurkening',
  },
  description:
    'Universal Telegram channel monitoring, Groq AI editorial intelligence (Llama-3.3), and real-time archival discovery across Ethiopian and global Telegram networks.',
  applicationName: 'The Lurkening',
  authors: [{ name: 'Fuad Tesfaye', url: 'https://github.com/FuadTesfaye' }],
  creator: 'The Lurkening',
  publisher: 'The Lurkening',
  keywords: [
    'Telegram',
    'Telegram Monitor',
    'AI Telegram Summary',
    'Groq AI',
    'Llama 3.3',
    'Telegram Bot',
    'The Lurkening',
    'Dagmawi Babi',
    'Ethiopia Telegram',
    'Tech Dispatches',
    'Real-time Telegram Feed',
    'Telegram Archive',
    'Telegram Broadcaster',
  ],
  manifest: '/manifest.webmanifest',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'The Lurkening',
    title: 'The Lurkening — Royal Telegram Broadsheet & Groq AI Intelligence',
    description:
      'Universal Telegram channel monitoring, Groq AI editorial intelligence (Llama-3.3), and real-time archival discovery across the Telegram ecosystem.',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'The Lurkening — Royal Broadsheet & Telegram Chronicle',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Lurkening — Royal Telegram Broadsheet & Groq AI Intelligence',
    description:
      'Universal Telegram channel monitoring, Groq AI editorial intelligence (Llama-3.3), and real-time archival discovery.',
    images: ['/opengraph-image'],
    creator: '@fuaf24',
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/icon-192.png',
    shortcut: '/icon-192.png',
    apple: '/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'The Lurkening',
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
  // JSON-LD Structured Data Schema
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${baseUrl}/#website`,
        url: baseUrl,
        name: 'The Lurkening',
        description:
          'Universal Telegram channel monitoring, Groq AI editorial intelligence, and multi-channel discovery.',
        publisher: {
          '@id': `${baseUrl}/#organization`,
        },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${baseUrl}/?search={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'NewsMediaOrganization',
        '@id': `${baseUrl}/#organization`,
        name: 'The Lurkening',
        url: baseUrl,
        logo: {
          '@type': 'ImageObject',
          url: `${baseUrl}/icon-512.png`,
          width: 512,
          height: 512,
        },
        sameAs: ['https://t.me/BabisummarizeBot'],
      },
    ],
  };

  return (
    <html lang="en" className="dark h-full">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
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
