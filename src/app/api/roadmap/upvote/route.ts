import { NextRequest, NextResponse } from 'next/server';
import { writeDb, getReadDb } from '@/db';
import { featureRequests, featureUpvotes } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getUserFromSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) {
      return NextResponse.json({ error: 'You must be signed in to upvote features.' }, { status: 401 });
    }

    const body = await req.json();
    const { featureId } = body;

    if (!featureId) {
      return NextResponse.json({ error: 'featureId is required' }, { status: 400 });
    }

    const db = getReadDb();
    const [existingUpvote] = await db
      .select()
      .from(featureUpvotes)
      .where(and(eq(featureUpvotes.featureId, featureId), eq(featureUpvotes.userId, user.id)))
      .limit(1);

    if (existingUpvote) {
      // Remove upvote
      await writeDb
        .delete(featureUpvotes)
        .where(and(eq(featureUpvotes.featureId, featureId), eq(featureUpvotes.userId, user.id)));

      await writeDb
        .update(featureRequests)
        .set({
          upvoteCount: sql`GREATEST(0, ${featureRequests.upvoteCount} - 1)`,
        })
        .where(eq(featureRequests.id, featureId));

      const [updated] = await getReadDb().select().from(featureRequests).where(eq(featureRequests.id, featureId)).limit(1);

      return NextResponse.json({
        success: true,
        hasUpvoted: false,
        upvoteCount: updated?.upvoteCount || 0,
      });
    } else {
      // Add upvote
      await writeDb.insert(featureUpvotes).values({
        featureId,
        userId: user.id,
      });

      await writeDb
        .update(featureRequests)
        .set({
          upvoteCount: sql`${featureRequests.upvoteCount} + 1`,
        })
        .where(eq(featureRequests.id, featureId));

      const [updated] = await getReadDb().select().from(featureRequests).where(eq(featureRequests.id, featureId)).limit(1);

      return NextResponse.json({
        success: true,
        hasUpvoted: true,
        upvoteCount: updated?.upvoteCount || 0,
      });
    }
  } catch (err: any) {
    console.error('[roadmap/upvote] Error:', err);
    return NextResponse.json({ error: 'Failed to upvote feature' }, { status: 500 });
  }
}
