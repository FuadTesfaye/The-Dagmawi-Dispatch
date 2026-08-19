import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Dagmawi Dispatch — Royal Broadsheet & Telegram Explorer",
  description: "An avant-garde archival publication and teleprinter search engine for Telegram dispatches.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Dispatch" },
  openGraph: {
    title: "The Dagmawi Dispatch",
    description: "Royal Broadsheet & Telegram Explorer",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0c0d10",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark h-full">
      <head>
        <link rel="apple-touch-icon" href="/logo.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-full bg-[#0c0d10] text-[#f4f0e6] antialiased selection:bg-[#d97706] selection:text-black">
        {/* Broadsheet Bulletin Line */}
        <div className="w-full bg-[#161822] border-b border-[#262936] py-1 px-4 text-center font-teletype text-[10px] tracking-widest text-[#a39e93] uppercase flex items-center justify-between">
          <span className="hidden sm:inline">✦ VOL. 2026 · NO. 88</span>
          <span>THE ROYAL ARCHIVE & TELEGRAM INDEX</span>
          <span className="hidden sm:inline">REAL-TIME INGESTION ✦</span>
        </div>

        {children}

        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
