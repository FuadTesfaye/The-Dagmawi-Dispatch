import { NextRequest, NextResponse } from 'next/server';
import { withReadDb } from '@/db';
import { posts, trackedChannels, postReactions, comments, aiReviews } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const postId = parseInt(resolvedParams.id, 10);
    if (isNaN(postId)) {
      return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
    }

    const { searchParams } = req.nextUrl;
    const channel = searchParams.get('channel') || 'dagmawi_babi';
    const user = await getCurrentUser();

    const postData = await withReadDb(async (db) => {
      const rows = await db
        .select({
          channel: posts.channel,
          id: posts.id,
          date: posts.date,
          localDate: posts.localDate,
          text: posts.text,
          mediaType: posts.mediaType,
          hasCaptionOnly: posts.hasCaptionOnly,
          permalink: posts.permalink,
          viewsCount: posts.viewsCount,
          createdAt: posts.createdAt,
          channelName: trackedChannels.name,
          channelAvatar: trackedChannels.avatarUrl,
          channelVerified: trackedChannels.isVerified,
        })
        .from(posts)
        .leftJoin(trackedChannels, eq(posts.channel, trackedChannels.id))
        .where(and(eq(posts.id, postId), eq(posts.channel, channel)))
        .limit(1);

      if (rows.length === 0) return null;
      const p = rows[0];

      // Reaction counts
      const reactionsRaw = await db
        .select({
          emoji: postReactions.emoji,
          count: sql<number>`count(*)::int`,
        })
        .from(postReactions)
        .where(and(eq(postReactions.channel, channel), eq(postReactions.postId, postId)))
        .groupBy(postReactions.emoji);

      const reactions: Record<string, number> = {};
      for (const r of reactionsRaw) {
        reactions[r.emoji] = r.count;
      }

      // User reactions
      let userReactions: string[] = [];
      if (user) {
        const urRows = await db
          .select({ emoji: postReactions.emoji })
          .from(postReactions)
          .where(
            and(
              eq(postReactions.userId, user.id),
              eq(postReactions.channel, channel),
              eq(postReactions.postId, postId)
            )
          );
        userReactions = urRows.map((r) => r.emoji);
      }

      // AI Reviews
      const reviews = await db
        .select()
        .from(aiReviews)
        .where(and(eq(aiReviews.channel, channel), eq(aiReviews.postId, postId)))
        .orderBy(aiReviews.createdAt);

      return {
        ...p,
        channelInfo: {
          id: p.channel,
          name: p.channelName || p.channel,
          avatarUrl: p.channelAvatar,
          isVerified: p.channelVerified || false,
        },
        reactions,
        userReactions,
        reviews,
      };
    });

    if (!postData) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json({ post: postData });
  } catch (err: any) {
    console.error('[api/posts/[id]] Error fetching post:', err);
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 });
  }
}
