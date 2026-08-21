import { NextRequest, NextResponse } from 'next/server';
import { getReadDb } from '@/db';
import { posts, trackedChannels, postTags } from '@/db/schema';
import { eq, desc, and, sql, ilike } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const channel = searchParams.get('channel') || '';
    const tag = searchParams.get('tag') || '';
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const offset = (page - 1) * limit;

    if (!query.trim() && !channel && !tag) {
      return NextResponse.json({ results: [], total: 0, query: '' });
    }

    const db = getReadDb();
    const conditions = [];

    if (query.trim()) {
      // Postgres ILIKE and full-text pattern match
      conditions.push(ilike(posts.text, `%${query.trim()}%`));
    }

    if (channel && channel !== 'all') {
      conditions.push(eq(posts.channel, channel));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        id: posts.id,
        channel: posts.channel,
        text: posts.text,
        date: posts.date,
        localDate: posts.localDate,
        viewsCount: posts.viewsCount,
        permalink: posts.permalink,
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

    // Format snippet with match highlighting
    const results = rows.map((r) => {
      const fullText = r.text || '';
      let snippet = fullText.slice(0, 200);
      if (query.trim()) {
        const idx = fullText.toLowerCase().indexOf(query.toLowerCase());
        if (idx !== -1) {
          const start = Math.max(0, idx - 60);
          const end = Math.min(fullText.length, idx + query.length + 100);
          snippet = (start > 0 ? '...' : '') + fullText.slice(start, end) + (end < fullText.length ? '...' : '');
        }
      }

      return {
        id: r.id,
        channel: r.channel,
        channelName: r.channelName || r.channel,
        channelAvatar: r.channelAvatar,
        isVerified: r.channelVerified || false,
        snippet,
        fullText,
        date: r.date,
        localDate: r.localDate,
        viewsCount: r.viewsCount,
        permalink: r.permalink,
      };
    });

    return NextResponse.json({
      results,
      count: results.length,
      page,
      query,
    });
  } catch (err: any) {
    console.error('[search] Error searching posts:', err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
