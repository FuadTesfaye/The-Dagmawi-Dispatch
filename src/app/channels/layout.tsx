import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Publication Registry & Monitored Telegram Channels',
  description:
    'Explore verified and community-indexed Telegram channels ingested into the autonomous archive for real-time AI summarization and multi-channel monitoring.',
  alternates: {
    canonical: '/channels',
  },
  openGraph: {
    title: 'Monitored Telegram Channels & Publication Registry | The Lurkening',
    description:
      'Browse and follow verified Telegram channels with autonomous AI intelligence.',
    url: '/channels',
  },
};

export default function ChannelsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
