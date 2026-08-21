import { NextRequest, NextResponse } from 'next/server';
import { getReadDb, writeDb } from '@/db';
import { digestSubscriptions, trackedChannels, posts, subscriptions } from '@/db/schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { getUserFromSession } from '@/lib/auth';
import { generateCrossChannelDigest } from '@/lib/ai';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    const db = getReadDb();

    // Determine channels to include in digest:
    // If user is authenticated and has digest subscriptions, use those.
    // Otherwise fallback to top subscribed / active channels.
    let targetChannelIds: string[] = [];

    if (user) {
      const userDigestSubs = await db
        .select({ channelId: digestSubscriptions.channelId })
        .from(digestSubscriptions)
        .where(and(eq(digestSubscriptions.userId, user.id), eq(digestSubscriptions.isEnabled, true)));

      targetChannelIds = userDigestSubs.map((s) => s.channelId);
    }

    if (targetChannelIds.length === 0) {
      const topChannels = await db
        .select({ id: trackedChannels.id })
        .from(trackedChannels)
        .orderBy(desc(trackedChannels.subscriberCount))
        .limit(5);

      targetChannelIds = topChannels.map((c) => c.id);
      if (targetChannelIds.length === 0) {
        targetChannelIds = ['dagmawi_babi', 'onyx_community'];
      }
    }

    // Fetch recent posts across target channels
    const channelsMeta = await db
      .select()
      .from(trackedChannels)
      .where(inArray(trackedChannels.id, targetChannelIds));

    const channelsData: { channel: string; channelName: string; posts: string[] }[] = [];

    for (const ch of channelsMeta) {
      const recentPosts = await db
        .select({ text: posts.text })
        .from(posts)
        .where(eq(posts.channel, ch.id))
        .orderBy(desc(posts.date))
        .limit(4);

      channelsData.push({
        channel: ch.id,
        channelName: ch.name,
        posts: recentPosts.map((p) => p.text || '').filter(Boolean),
      });
    }

    const digestResult = await generateCrossChannelDigest(channelsData);

    return NextResponse.json({
      digest: {
        date: new Date().toISOString().split('T')[0],
        headline: digestResult.headline,
        overviewSummary: digestResult.overviewSummary,
        channelHighlights: digestResult.channelHighlights,
        generatedAt: new Date().toISOString(),
        modelUsed: digestResult.model,
      },
      channelsIncluded: targetChannelIds,
    });
  } catch (err: any) {
    console.error('[digest] Error generating cross-channel digest:', err);
    return NextResponse.json({ error: 'Failed to generate cross-channel daily digest' }, { status: 500 });
  }
}
