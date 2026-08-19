import { NextRequest, NextResponse } from 'next/server';
import { withReadDb, writeDb } from '@/db';
import { subscriptions, trackedChannels } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

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
    const channelId = resolvedParams.id;
    if (!channelId) {
      return NextResponse.json({ error: 'Missing channel ID' }, { status: 400 });
    }

    // Check existing subscription
    const existing = await withReadDb((db) =>
      db
        .select()
        .from(subscriptions)
        .where(and(eq(subscriptions.userId, user.id), eq(subscriptions.channelId, channelId)))
        .limit(1)
    );

    let isSubscribed = false;
    if (existing.length > 0) {
      // Unsubscribe
      await writeDb
        .delete(subscriptions)
        .where(and(eq(subscriptions.userId, user.id), eq(subscriptions.channelId, channelId)));

      await writeDb
        .update(trackedChannels)
        .set({
          subscriberCount: sql`GREATEST(0, ${trackedChannels.subscriberCount} - 1)`,
        })
        .where(eq(trackedChannels.id, channelId));

      isSubscribed = false;
    } else {
      // Subscribe
      await writeDb.insert(subscriptions).values({
        userId: user.id,
        channelId,
      });

      await writeDb
        .update(trackedChannels)
        .set({
          subscriberCount: sql`${trackedChannels.subscriberCount} + 1`,
        })
        .where(eq(trackedChannels.id, channelId));

      isSubscribed = true;
    }

    // Fetch updated channel subscriber count
    const updatedChannel = await withReadDb((db) =>
      db
        .select({ subscriberCount: trackedChannels.subscriberCount })
        .from(trackedChannels)
        .where(eq(trackedChannels.id, channelId))
        .limit(1)
    );

    return NextResponse.json({
      success: true,
      isSubscribed,
      subscriberCount: updatedChannel[0]?.subscriberCount || 0,
    });
  } catch (err: any) {
    console.error('[api/channels/subscribe] Error toggling subscription:', err);
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
  }
}
