import { NextRequest, NextResponse } from 'next/server';
import { withReadDb, writeDb } from '@/db';
import { postReactions } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { realtimeHub } from '@/lib/realtime';

const ALLOWED_EMOJIS = ['🔥', '🎺', '💀', '❤️', '👏', '🤔'];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 });
    }

    const resolvedParams = await params;
    const postId = parseInt(resolvedParams.id, 10);
    if (isNaN(postId)) {
      return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
    }

    const body = await req.json();
    const { emoji, channel = 'dagmawi_babi' } = body;

    if (!emoji || !ALLOWED_EMOJIS.includes(emoji)) {
      return NextResponse.json({ error: 'Invalid emoji reaction' }, { status: 400 });
    }

    // Check if reaction already exists
    const existing = await withReadDb((db) =>
      db
        .select()
        .from(postReactions)
        .where(
          and(
            eq(postReactions.userId, user.id),
            eq(postReactions.channel, channel),
            eq(postReactions.postId, postId),
            eq(postReactions.emoji, emoji)
          )
        )
        .limit(1)
    );

    let isAdded = false;
    if (existing.length > 0) {
      // Toggle off: Delete reaction
      await writeDb
        .delete(postReactions)
        .where(
          and(
            eq(postReactions.userId, user.id),
            eq(postReactions.channel, channel),
            eq(postReactions.postId, postId),
            eq(postReactions.emoji, emoji)
          )
        );
      isAdded = false;
    } else {
      // Toggle on: Insert reaction
      await writeDb.insert(postReactions).values({
        channel,
        postId,
        userId: user.id,
        emoji,
      });
      isAdded = true;
    }

    // Get updated aggregated reactions
    const reactionsRaw = await withReadDb((db) =>
      db
        .select({
          emoji: postReactions.emoji,
          count: sql<number>`count(*)::int`,
        })
        .from(postReactions)
        .where(and(eq(postReactions.channel, channel), eq(postReactions.postId, postId)))
        .groupBy(postReactions.emoji)
    );

    const reactions: Record<string, number> = {};
    for (const r of reactionsRaw) {
      reactions[r.emoji] = r.count;
    }

    // Get current user's reactions
    const userReactionRows = await withReadDb((db) =>
      db
        .select({ emoji: postReactions.emoji })
        .from(postReactions)
        .where(
          and(
            eq(postReactions.userId, user.id),
            eq(postReactions.channel, channel),
            eq(postReactions.postId, postId)
          )
        )
    );
    const userReactions = userReactionRows.map((r) => r.emoji);

    // Broadcast to real-time subscribers
    realtimeHub.broadcast({
      type: 'reaction_update',
      channel,
      postId,
      data: { reactions },
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      isAdded,
      reactions,
      userReactions,
    });
  } catch (err: any) {
    console.error('[api/reactions] Error toggling reaction:', err);
    return NextResponse.json({ error: 'Failed to toggle reaction' }, { status: 500 });
  }
}
