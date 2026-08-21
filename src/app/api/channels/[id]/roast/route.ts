import { NextRequest, NextResponse } from 'next/server';
import { getReadDb, writeDb } from '@/db';
import { channelRoasts, trackedChannels, posts } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { generateChannelRoast } from '@/lib/ai';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: channelId } = await params;
    const { searchParams } = new URL(req.url);
    const roastType = (searchParams.get('type') || 'daily') as 'daily' | 'onboarding' | 'chaos_spike';
    const forceRefresh = searchParams.get('refresh') === 'true';

    const db = getReadDb();

    // Check if channel exists
    const [channel] = await db.select().from(trackedChannels).where(eq(trackedChannels.id, channelId)).limit(1);
    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    // Check existing roast in DB if not force refresh
    if (!forceRefresh) {
      const [existingRoast] = await db
        .select()
        .from(channelRoasts)
        .where(and(eq(channelRoasts.channel, channelId), eq(channelRoasts.roastType, roastType)))
        .orderBy(desc(channelRoasts.createdAt))
        .limit(1);

      if (existingRoast) {
        return NextResponse.json({ roast: existingRoast });
      }
    }

    // Fetch recent posts and post count
    const recentPosts = await db
      .select({ text: posts.text })
      .from(posts)
      .where(eq(posts.channel, channelId))
      .orderBy(desc(posts.date))
      .limit(6);

    const postSnippets = recentPosts.map((p) => p.text || '').filter(Boolean);
    const postCount = recentPosts.length;

    // Generate new content-aware roast using Llama 3.3
    const generated = await generateChannelRoast(
      channel.name || channelId,
      postCount,
      postSnippets,
      roastType
    );

    // Store in DB
    const [newRoast] = await writeDb
      .insert(channelRoasts)
      .values({
        channel: channelId,
        roastType,
        content: generated.content,
        postCount,
        chaosScore: generated.chaosScore,
        modelUsed: generated.model,
      })
      .returning();

    return NextResponse.json({ roast: newRoast });
  } catch (err: any) {
    console.error('[channels/roast] Error:', err);
    return NextResponse.json({ error: 'Failed to generate channel roast' }, { status: 500 });
  }
}
