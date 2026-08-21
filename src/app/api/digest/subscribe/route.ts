import { NextRequest, NextResponse } from 'next/server';
import { writeDb, getReadDb } from '@/db';
import { digestSubscriptions, trackedChannels } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getUserFromSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) {
      return NextResponse.json({ subscriptions: [] });
    }

    const db = getReadDb();
    const subs = await db
      .select({
        channelId: digestSubscriptions.channelId,
        isEnabled: digestSubscriptions.isEnabled,
        deliveryTime: digestSubscriptions.deliveryTime,
        channelName: trackedChannels.name,
        channelAvatar: trackedChannels.avatarUrl,
      })
      .from(digestSubscriptions)
      .leftJoin(trackedChannels, eq(digestSubscriptions.channelId, trackedChannels.id))
      .where(eq(digestSubscriptions.userId, user.id));

    return NextResponse.json({ subscriptions: subs });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch digest subscriptions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { channelId, isEnabled = true, deliveryTime = '08:00' } = body;

    if (!channelId) {
      return NextResponse.json({ error: 'channelId is required' }, { status: 400 });
    }

    const db = getReadDb();
    const [existing] = await db
      .select()
      .from(digestSubscriptions)
      .where(and(eq(digestSubscriptions.userId, user.id), eq(digestSubscriptions.channelId, channelId)))
      .limit(1);

    if (existing) {
      const [updated] = await writeDb
        .update(digestSubscriptions)
        .set({
          isEnabled,
          deliveryTime,
          updatedAt: new Date(),
        })
        .where(and(eq(digestSubscriptions.userId, user.id), eq(digestSubscriptions.channelId, channelId)))
        .returning();

      return NextResponse.json({ success: true, subscription: updated });
    } else {
      const [created] = await writeDb
        .insert(digestSubscriptions)
        .values({
          userId: user.id,
          channelId,
          isEnabled,
          deliveryTime,
        })
        .returning();

      return NextResponse.json({ success: true, subscription: created });
    }
  } catch (err: any) {
    console.error('[digest/subscribe] Error updating digest subscription:', err);
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
  }
}
