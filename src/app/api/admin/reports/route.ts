import { NextRequest, NextResponse } from 'next/server';
import { withReadDb, writeDb } from '@/db';
import { moderationReports, users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
      return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
    }

    const reports = await withReadDb((db) =>
      db
        .select({
          id: moderationReports.id,
          userId: moderationReports.userId,
          targetType: moderationReports.targetType,
          channel: moderationReports.channel,
          postId: moderationReports.postId,
          commentId: moderationReports.commentId,
          reason: moderationReports.reason,
          details: moderationReports.details,
          status: moderationReports.status,
          createdAt: moderationReports.createdAt,
          reporterName: users.displayName,
          reporterUsername: users.username,
        })
        .from(moderationReports)
        .leftJoin(users, eq(moderationReports.userId, users.id))
        .orderBy(desc(moderationReports.createdAt))
    );

    const formatted = reports.map((r) => ({
      id: r.id,
      userId: r.userId,
      targetType: r.targetType,
      channel: r.channel,
      postId: r.postId,
      commentId: r.commentId,
      reason: r.reason,
      details: r.details,
      status: r.status,
      createdAt: r.createdAt?.toISOString() || new Date().toISOString(),
      user: {
        displayName: r.reporterName || 'Anonymous User',
        username: r.reporterUsername,
      },
    }));

    return NextResponse.json({ reports: formatted });
  } catch (err: any) {
    console.error('[api/admin/reports] Error fetching reports:', err);
    return NextResponse.json({ error: 'Failed to fetch moderation reports' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
      return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });
    }

    const body = await req.json();
    const { reportId, status } = body;

    if (!reportId || !['pending', 'reviewed', 'dismissed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid report ID or status' }, { status: 400 });
    }

    const updated = await writeDb
      .update(moderationReports)
      .set({ status })
      .where(eq(moderationReports.id, reportId))
      .returning();

    return NextResponse.json({ success: true, report: updated[0] });
  } catch (err: any) {
    console.error('[api/admin/reports] Error updating report:', err);
    return NextResponse.json({ error: 'Failed to update report status' }, { status: 500 });
  }
}
