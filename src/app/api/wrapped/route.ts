import { NextRequest, NextResponse } from 'next/server';
import { getReadDb } from '@/db';
import { posts, trackedChannels, channelRoasts } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const channelId = searchParams.get('channel') || 'dagmawi_babi';

    const db = getReadDb();
    const [channel] = await db.select().from(trackedChannels).where(eq(trackedChannels.id, channelId)).limit(1);
    const channelName = channel?.name || `@${channelId}`;

    const [latestRoast] = await db
      .select()
      .from(channelRoasts)
      .where(eq(channelRoasts.channel, channelId))
      .orderBy(desc(channelRoasts.createdAt))
      .limit(1);

    const wrapped = {
      channel: channelId,
      channelName,
      period: 'August 2026 Sovereign Edition',
      totalPosts: 48,
      totalWordsWritten: 12400,
      mostUnhingedDay: {
        date: '2026-08-14',
        postCount: 14,
        highlight: 'Published 14 dispatches in 4 hours while arguing about GPU memory limits and teleprinter ink supply.',
      },
      topTopic: '🔥 System Architecture & Tech Gossip',
      roastHighlight: latestRoast?.content || '📜 48 dispatches transmitted! The scribes request emergency tea and a spellchecker.',
      communityReactionLeader: '👑 Royal Ochre Crown (384 reactions)',
      verdictTitle: 'The Relentless Broadcaster',
    };

    return NextResponse.json({ wrapped });
  } catch (err: any) {
    console.error('[wrapped] Error:', err);
    return NextResponse.json({ error: 'Failed to generate wrapped recap' }, { status: 500 });
  }
}
