import { NextRequest, NextResponse } from 'next/server';
import { withReadDb } from '@/db';
import { trackedChannels, subscriptions, posts } from '@/db/schema';
import { desc, ilike, eq, sql, or } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const query = searchParams.get('q');
    const user = await getCurrentUser();

    const channelRows = await withReadDb(async (db) => {
      let whereClause;
      if (query && query.trim()) {
        const pattern = `%${query.trim()}%`;
        whereClause = or(
          ilike(trackedChannels.id, pattern),
          ilike(trackedChannels.name, pattern),
          ilike(trackedChannels.description, pattern)
        );
      }

      return db
        .select()
        .from(trackedChannels)
        .where(whereClause)
        .orderBy(desc(trackedChannels.subscriberCount));
    });

    // Check user subscriptions and post counts
    const userSubscribedChannelIds = new Set<string>();
    if (user) {
      const userSubs = await withReadDb((db) =>
        db
          .select({ channelId: subscriptions.channelId })
          .from(subscriptions)
          .where(eq(subscriptions.userId, user.id))
      );
      for (const s of userSubs) {
        userSubscribedChannelIds.add(s.channelId);
      }
    }

    // Get post counts per channel
    const postCounts = await withReadDb((db) =>
      db
        .select({
          channel: posts.channel,
          count: sql<number>`count(*)::int`,
        })
        .from(posts)
        .groupBy(posts.channel)
    );

    const postCountMap = new Map<string, number>();
    for (const pc of postCounts) {
      postCountMap.set(pc.channel, pc.count);
    }

    const channels = channelRows.map((ch) => ({
      id: ch.id,
      name: ch.name,
      description: ch.description,
      avatarUrl: ch.avatarUrl,
      subscriberCount: ch.subscriberCount,
      isVerified: ch.isVerified,
      createdAt: ch.createdAt?.toISOString() || new Date().toISOString(),
      isSubscribed: userSubscribedChannelIds.has(ch.id),
      postCount: postCountMap.get(ch.id) || 0,
    }));

    return NextResponse.json({ channels });
  } catch (err: any) {
    console.error('[api/channels] Error querying channels:', err);
    return NextResponse.json({ error: 'Failed to fetch channels' }, { status: 500 });
  }
}
