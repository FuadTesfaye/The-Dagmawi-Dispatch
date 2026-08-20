import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { writeDb } from '@/db';
import { subscriptions, trackedChannels } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const resolvedParams = await params;
    const channelId = resolvedParams.id.toLowerCase().replace(/^@/, '');

    let bodyState: boolean | undefined;
    try {
      const body = await req.json();
      if (typeof body.isMuted === 'boolean') {
        bodyState = body.isMuted;
      }
    } catch {}

    if (!user) {
      // Return guest-friendly response so client-side localStorage handles it
      const nextMuted = bodyState !== undefined ? bodyState : true;
      return NextResponse.json({
        success: true,
        channelId,
        isMuted: nextMuted,
        isGuest: true,
      });
    }

    // Ensure channel exists
    const channelExists = await writeDb
      .select()
      .from(trackedChannels)
      .where(eq(trackedChannels.id, channelId))
      .limit(1);

    if (channelExists.length === 0) {
      await writeDb
        .insert(trackedChannels)
        .values({
          id: channelId,
          name: `@${channelId}`,
          description: 'Telegram publication wire',
          subscriberCount: 0,
        })
        .onConflictDoNothing();
    }

    // Check existing subscription
    const existing = await writeDb
      .select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, user.id),
          eq(subscriptions.channelId, channelId)
        )
      )
      .limit(1);

    let nextMutedState: boolean;

    if (existing.length > 0) {
      nextMutedState = bodyState !== undefined ? bodyState : !existing[0].isMuted;
      await writeDb
        .update(subscriptions)
        .set({ isMuted: nextMutedState })
        .where(
          and(
            eq(subscriptions.userId, user.id),
            eq(subscriptions.channelId, channelId)
          )
        );
    } else {
      nextMutedState = bodyState !== undefined ? bodyState : true;
      await writeDb.insert(subscriptions).values({
        userId: user.id,
        channelId,
        isMuted: nextMutedState,
      });
    }

    return NextResponse.json({
      success: true,
      channelId,
      isMuted: nextMutedState,
      isGuest: false,
    });
  } catch (err: any) {
    console.error('[api/channels/mute] Error toggling channel mute state:', err);
    return NextResponse.json({ error: 'Failed to toggle channel mute state' }, { status: 500 });
  }
}
