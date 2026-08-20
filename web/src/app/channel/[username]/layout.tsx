import type { Metadata } from 'next';
import { withReadDb } from '@/db';
import { trackedChannels } from '@/db/schema';
import { eq } from 'drizzle-orm';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://thelurkening.com';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const username = resolvedParams.username.replace(/^@/, '');

  let channelName = `@${username}`;
  let description = `Telegram broadcasts, activity telemetry, and Groq AI summaries for @${username}.`;
  let avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`;

  try {
    const found = await withReadDb((db) =>
      db
        .select()
        .from(trackedChannels)
        .where(eq(trackedChannels.id, username))
        .limit(1)
    );

    if (found.length > 0) {
      const ch = found[0];
      channelName = ch.name ? `${ch.name} (@${ch.id})` : `@${ch.id}`;
      if (ch.description) description = ch.description;
      if (ch.avatarUrl) avatarUrl = ch.avatarUrl;
    }
  } catch {
    // Fallback to default
  }

  const pageUrl = `/channel/${username}`;

  return {
    title: `${channelName} — Telegram Channel Dispatches & Activity`,
    description,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title: `${channelName} | The Lurkening`,
      description,
      url: pageUrl,
      images: [
        {
          url: avatarUrl,
          width: 256,
          height: 256,
          alt: channelName,
        },
      ],
    },
    twitter: {
      card: 'summary',
      title: `${channelName} | The Lurkening`,
      description,
      images: [avatarUrl],
    },
  };
}

export default async function ChannelLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ username: string }>;
}) {
  const resolvedParams = await params;
  const username = resolvedParams.username.replace(/^@/, '');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Organization',
      name: `@${username}`,
      url: `${baseUrl}/channel/${username}`,
      sameAs: `https://t.me/${username}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
