import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'The Dagmawi Dispatch — Royal Broadsheet',
    short_name: 'Dispatch',
    description: 'An avant-garde archival publication and teleprinter feed of high-frequency Telegram dispatches with AI editorial synthesis.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'window-controls-overlay'],
    background_color: '#0c0d10',
    theme_color: '#0c0d10',
    orientation: 'portrait-primary',
    categories: ['news', 'magazines', 'social', 'productivity'],
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Broadsheet Feed',
        short_name: 'Feed',
        description: 'Read the latest Telegram broadsheet dispatches',
        url: '/',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Channel Ledger',
        short_name: 'Channels',
        description: 'Browse monitored publication registry',
        url: '/channels',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Scribe Records',
        short_name: 'Scribe',
        description: 'View subscriptions and court profile',
        url: '/profile',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }],
      },
    ],
  };
}
