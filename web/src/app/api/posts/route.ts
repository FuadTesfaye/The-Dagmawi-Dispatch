import { NextRequest, NextResponse } from 'next/server';
import { withReadDb } from '@/db';
import { posts, trackedChannels, postReactions, comments, aiReviews } from '@/db/schema';
import { eq, desc, and, sql, ilike } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const channel = searchParams.get('channel');
    const search = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    const user = await getCurrentUser();

    // Query posts with channel info
    const postRows = await withReadDb(async (db) => {
      const conditions = [];

      if (channel && channel !== 'all') {
        conditions.push(eq(posts.channel, channel));
      }

      if (search && search.trim()) {
        conditions.push(ilike(posts.text, `%${search.trim()}%`));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      return db
        .select({
          channel: posts.channel,
          id: posts.id,
          date: posts.date,
          localDate: posts.localDate,
          text: posts.text,
          mediaType: posts.mediaType,
          hasCaptionOnly: posts.hasCaptionOnly,
          permalink: posts.permalink,
          rawJson: posts.rawJson,
          viewsCount: posts.viewsCount,
          createdAt: posts.createdAt,
          channelName: trackedChannels.name,
          channelAvatar: trackedChannels.avatarUrl,
          channelVerified: trackedChannels.isVerified,
        })
        .from(posts)
        .leftJoin(trackedChannels, eq(posts.channel, trackedChannels.id))
        .where(whereClause)
        .orderBy(desc(posts.date))
        .limit(limit)
        .offset(offset);
    });

    if (postRows.length === 0) {
      return NextResponse.json({ posts: [], hasMore: false, page });
    }

    // Batch fetch reactions, comment counts, and user's reactions
    const enrichedPosts = await withReadDb(async (db) => {
      const postKeys = postRows.map((p) => ({ channel: p.channel, id: p.id }));

      // Fetch reaction counts
      const reactionsRaw = await db
        .select({
          channel: postReactions.channel,
          postId: postReactions.postId,
          emoji: postReactions.emoji,
          count: sql<number>`count(*)::int`,
        })
        .from(postReactions)
        .where(
          sql`(${postReactions.channel}, ${postReactions.postId}) IN (${sql.join(
            postKeys.map((pk) => sql`(${pk.channel}, ${pk.id})`),
            sql`, `
          )})`
        )
        .groupBy(postReactions.channel, postReactions.postId, postReactions.emoji);

      // Fetch user's own reactions if logged in
      let userReactionsRaw: { channel: string; postId: number; emoji: string }[] = [];
      if (user) {
        userReactionsRaw = await db
          .select({
            channel: postReactions.channel,
            postId: postReactions.postId,
            emoji: postReactions.emoji,
          })
          .from(postReactions)
          .where(
            and(
              eq(postReactions.userId, user.id),
              sql`(${postReactions.channel}, ${postReactions.postId}) IN (${sql.join(
                postKeys.map((pk) => sql`(${pk.channel}, ${pk.id})`),
                sql`, `
              )})`
            )
          );
      }

      // Fetch comment counts
      const commentsCountRaw = await db
        .select({
          channel: comments.channel,
          postId: comments.postId,
          count: sql<number>`count(*)::int`,
        })
        .from(comments)
        .where(
          sql`(${comments.channel}, ${comments.postId}) IN (${sql.join(
            postKeys.map((pk) => sql`(${pk.channel}, ${pk.id})`),
            sql`, `
          )})`
        )
        .groupBy(comments.channel, comments.postId);

      // Fetch AI review counts
      const aiCountRaw = await db
        .select({
          channel: aiReviews.channel,
          postId: aiReviews.postId,
          count: sql<number>`count(*)::int`,
        })
        .from(aiReviews)
        .where(
          sql`(${aiReviews.channel}, ${aiReviews.postId}) IN (${sql.join(
            postKeys.map((pk) => sql`(${pk.channel}, ${pk.id})`),
            sql`, `
          )})`
        )
        .groupBy(aiReviews.channel, aiReviews.postId);

      return postRows.map((p) => {
        const reactions: Record<string, number> = {};
        for (const r of reactionsRaw) {
          if (r.channel === p.channel && r.postId === p.id) {
            reactions[r.emoji] = r.count;
          }
        }

        const userReactions = userReactionsRaw
          .filter((ur) => ur.channel === p.channel && ur.postId === p.id)
          .map((ur) => ur.emoji);

        const commentCount =
          commentsCountRaw.find((c) => c.channel === p.channel && c.postId === p.id)?.count || 0;

        const aiReviewCount =
          aiCountRaw.find((a) => a.channel === p.channel && a.postId === p.id)?.count || 0;

        const raw = p.rawJson as any;
        const forwardFrom = raw?.forwardFrom || (raw?.fwdFrom ? {
          name: raw.fwdFrom.fromName || raw.fwdFrom.postAuthor || 'Forwarded Channel',
          channel: raw.fwdFrom.channelPost ? String(raw.fwdFrom.channelPost) : undefined,
          postId: typeof raw.fwdFrom.channelPost === 'number' ? raw.fwdFrom.channelPost : undefined,
        } : (raw?.forward_from_chat ? {
          name: raw.forward_from_chat.title || `@${raw.forward_from_chat.username}`,
          channel: raw.forward_from_chat.username,
          postId: raw.forward_from_message_id,
          url: raw.forward_from_chat.username ? `https://t.me/${raw.forward_from_chat.username}` : undefined,
        } : (raw?.forward_from ? {
          name: raw.forward_from.first_name || 'Forwarded Author',
          channel: raw.forward_from.username,
        } : undefined)));

        const replyTo = raw?.replyTo || (raw?.replyToMsgId ? {
          id: raw.replyToMsgId,
          channel: p.channel,
        } : (raw?.reply_to_message ? {
          id: raw.reply_to_message.message_id,
          channel: raw.reply_to_message.chat?.username || p.channel,
          authorName: raw.reply_to_message.from?.first_name || raw.reply_to_message.chat?.title,
          text: raw.reply_to_message.text,
        } : undefined));

        return {
          ...p,
          forwardFrom,
          replyTo,
          channelInfo: {
            id: p.channel,
            name: p.channelName || p.channel,
            avatarUrl: p.channelAvatar,
            isVerified: p.channelVerified || false,
          },
          reactions,
          userReactions,
          commentCount,
          aiReviewCount,
        };
      });
    });

    return NextResponse.json({
      posts: enrichedPosts,
      hasMore: postRows.length === limit,
      page,
    });
  } catch (err: any) {
    console.error('[api/posts] Error querying posts:', err);
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}
