import { NextRequest, NextResponse } from 'next/server';
import { withReadDb, writeDb } from '@/db';
import { posts, aiReviews } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateAIReview, AIReviewKind } from '@/lib/ai';
import { realtimeHub } from '@/lib/realtime';

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

    const reviews = await withReadDb((db) =>
      db
        .select()
        .from(aiReviews)
        .where(and(eq(aiReviews.channel, channel), eq(aiReviews.postId, postId)))
        .orderBy(aiReviews.createdAt)
    );

    return NextResponse.json({ reviews });
  } catch (err: any) {
    console.error('[api/ai-review] Error fetching reviews:', err);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const postId = parseInt(resolvedParams.id, 10);
    if (isNaN(postId)) {
      return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
    }

    const body = await req.json();
    const kind = (body.kind as AIReviewKind) || 'summary';
    const channel = body.channel || 'dagmawi_babi';

    // Fetch the post from DB
    const postRows = await withReadDb((db) =>
      db
        .select()
        .from(posts)
        .where(and(eq(posts.channel, channel), eq(posts.id, postId)))
        .limit(1)
    );

    if (postRows.length === 0) {
      return NextResponse.json({ error: 'Post not found in kingdom archives' }, { status: 404 });
    }

    const targetPost = postRows[0];
    const postText = targetPost.text || '(Image or Media dispatch without caption)';

    // Generate AI commentary with Groq pool
    const { content, model } = await generateAIReview(postText, kind, channel);

    // Save to ai_reviews table
    const inserted = await writeDb
      .insert(aiReviews)
      .values({
        channel,
        postId,
        kind,
        content,
        modelUsed: model,
      })
      .returning();

    const createdReview = inserted[0];

    // Broadcast in real-time
    realtimeHub.broadcast({
      type: 'new_ai_review',
      channel,
      postId,
      data: createdReview,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, review: createdReview });
  } catch (err: any) {
    console.error('[api/ai-review] Error generating AI review:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to generate AI commentary' },
      { status: 500 }
    );
  }
}
