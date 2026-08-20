import type { MetadataRoute } from 'next';
import { withReadDb } from '@/db';
import { trackedChannels, posts } from '@/db/schema';
import { desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://thelurkening.com';
  const now = new Date();

  // 1. Static Core Routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: now,
      changeFrequency: 'always',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/channels`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/profile`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  ];

  // 2. Dynamic Channel Routes from Database
  let channelRoutes: MetadataRoute.Sitemap = [];
  try {
    const channels = await withReadDb((db) => db.select().from(trackedChannels));
    channelRoutes = channels.map((ch) => ({
      url: `${baseUrl}/channel/${ch.id}`,
      lastModified: ch.createdAt || now,
      changeFrequency: 'hourly' as const,
      priority: 0.8,
    }));
  } catch {
    // Fallback default channels
    const fallbackChannels = ['dagmawi_babi', 'tikvahethiopia'];
    channelRoutes = fallbackChannels.map((id) => ({
      url: `${baseUrl}/channel/${id}`,
      lastModified: now,
      changeFrequency: 'hourly' as const,
      priority: 0.8,
    }));
  }

  // 3. Dynamic Recent Dispatches from Database
  let postRoutes: MetadataRoute.Sitemap = [];
  try {
    const recentPosts = await withReadDb((db) =>
      db
        .select({ channel: posts.channel, id: posts.id, date: posts.date })
        .from(posts)
        .orderBy(desc(posts.date))
        .limit(100)
    );
    postRoutes = recentPosts.map((p) => ({
      url: `${baseUrl}/post/${p.id}?channel=${encodeURIComponent(p.channel)}`,
      lastModified: p.date || now,
      changeFrequency: 'daily' as const,
      priority: 0.7,
    }));
  } catch {
    // Graceful fallback if database read fails
  }

  return [...staticRoutes, ...channelRoutes, ...postRoutes];
}
