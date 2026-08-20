import type { Metadata } from 'next';
import { withReadDb } from '@/db';
import { posts } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://thelurkening.com';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const postId = parseInt(resolvedParams.id, 10);

  let title = `Dispatch #${resolvedParams.id}`;
  let description = `Read Telegram telegraph dispatch #${resolvedParams.id} with Groq AI editorial brief and community testimony.`;
  let publishDate: string | undefined;
  let channel = 'dagmawi_babi';

  if (!isNaN(postId)) {
    try {
      const found = await withReadDb((db) =>
        db
          .select()
          .from(posts)
          .where(eq(posts.id, postId))
          .limit(1)
      );

      if (found.length > 0) {
        const p = found[0];
        channel = p.channel;
        title = `Dispatch #${p.id} from @${p.channel}`;
        if (p.text) {
          description = p.text.slice(0, 160).replace(/\s+/g, ' ').trim() + (p.text.length > 160 ? '...' : '');
        }
        if (p.date) {
          publishDate = p.date.toISOString();
        }
      }
    } catch {
      // Fallback
    }
  }

  const pageUrl = `/post/${resolvedParams.id}?channel=${channel}`;

  return {
    title,
    description,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title: `${title} | The Lurkening`,
      description,
      url: pageUrl,
      type: 'article',
      publishedTime: publishDate,
      authors: [`@${channel}`],
      images: ['/opengraph-image'],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | The Lurkening`,
      description,
      images: ['/opengraph-image'],
    },
  };
}

export default async function PostLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const postId = parseInt(resolvedParams.id, 10);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SocialMediaPosting',
    headline: `Dispatch #${resolvedParams.id}`,
    url: `${baseUrl}/post/${resolvedParams.id}`,
    publisher: {
      '@type': 'Organization',
      name: 'The Lurkening',
      url: baseUrl,
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
