import { NextRequest, NextResponse } from 'next/server';
import { writeDb } from '@/db';
import { moderationReports } from '@/db/schema';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    const { targetType, channel, postId, commentId, reason, details } = body;

    if (!targetType || !channel || !reason) {
      return NextResponse.json({ error: 'Missing required report fields' }, { status: 400 });
    }

    const inserted = await writeDb
      .insert(moderationReports)
      .values({
        userId: user?.id || null,
        targetType: targetType === 'comment' ? 'comment' : 'post',
        channel,
        postId: postId ? parseInt(postId, 10) : null,
        commentId: commentId || null,
        reason: reason.trim().slice(0, 100),
        details: details ? details.trim().slice(0, 500) : null,
        status: 'pending',
      })
      .returning();

    return NextResponse.json({
      success: true,
      reportId: inserted[0].id,
      message: 'Report submitted for royal court review. Thank you for keeping the realm civil!',
    });
  } catch (err: any) {
    console.error('[api/reports] Error creating moderation report:', err);
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
  }
}
