import { NextRequest, NextResponse } from 'next/server';
import { withReadDb, writeDb } from '@/db';
import { comments, users } from '@/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
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

    const commentRows = await withReadDb(async (db) => {
      return db
        .select({
          id: comments.id,
          channel: comments.channel,
          postId: comments.postId,
          userId: comments.userId,
          content: comments.content,
          parentId: comments.parentId,
          createdAt: comments.createdAt,
          updatedAt: comments.updatedAt,
          authorName: users.displayName,
          authorUsername: users.username,
          authorPhoto: users.photoUrl,
          authorRole: users.role,
        })
        .from(comments)
        .leftJoin(users, eq(comments.userId, users.id))
        .where(and(eq(comments.channel, channel), eq(comments.postId, postId)))
        .orderBy(asc(comments.createdAt));
    });

    const formatted = commentRows.map((c) => ({
      id: c.id,
      channel: c.channel,
      postId: c.postId,
      userId: c.userId,
      content: c.content,
      parentId: c.parentId,
      createdAt: c.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: c.updatedAt?.toISOString() || new Date().toISOString(),
      user: {
        displayName: c.authorName || 'Anonymous Citizen',
        username: c.authorUsername,
        photoUrl: c.authorPhoto,
        role: c.authorRole || 'user',
      },
    }));

    return NextResponse.json({ comments: formatted });
  } catch (err: any) {
    console.error('[api/comments] Error fetching comments:', err);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

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
    const { content, channel = 'dagmawi_babi', parentId = null } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Comment content cannot be empty' }, { status: 400 });
    }

    const trimmed = content.trim().slice(0, 1000);

    const inserted = await writeDb
      .insert(comments)
      .values({
        channel,
        postId,
        userId: user.id,
        content: trimmed,
        parentId: parentId || null,
      })
      .returning();

    const createdComment = inserted[0];

    const commentWithUser = {
      id: createdComment.id,
      channel: createdComment.channel,
      postId: createdComment.postId,
      userId: createdComment.userId,
      content: createdComment.content,
      parentId: createdComment.parentId,
      createdAt: createdComment.createdAt.toISOString(),
      updatedAt: createdComment.updatedAt.toISOString(),
      user: {
        displayName: user.displayName,
        username: user.username,
        photoUrl: user.photoUrl,
        role: user.role,
      },
    };

    // Broadcast in real-time to all connected subscribers
    realtimeHub.broadcast({
      type: 'new_comment',
      channel,
      postId,
      data: commentWithUser,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, comment: commentWithUser });
  } catch (err: any) {
    console.error('[api/comments] Error creating comment:', err);
    return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 });
  }
}
