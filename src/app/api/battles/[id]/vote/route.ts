import { NextRequest, NextResponse } from 'next/server';
import { writeDb, getReadDb } from '@/db';
import { roastBattles, battleVotes } from '@/db/schema';
import { eq, sql, and } from 'drizzle-orm';
import { getUserFromSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: battleId } = await params;
    const user = await getUserFromSession(req);

    if (!user) {
      return NextResponse.json(
        { error: 'You must be signed into the broadsheet realm to vote in roast battles.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { votedFor } = body; // 'A' or 'B'

    if (!['A', 'B'].includes(votedFor)) {
      return NextResponse.json({ error: 'Invalid vote target (must be A or B)' }, { status: 400 });
    }

    // Check if battle exists
    const db = getReadDb();
    const [battle] = await db.select().from(roastBattles).where(eq(roastBattles.id, battleId)).limit(1);
    if (!battle || battle.status !== 'active') {
      return NextResponse.json({ error: 'Battle not found or already completed' }, { status: 404 });
    }

    // Check existing vote
    const [existingVote] = await db
      .select()
      .from(battleVotes)
      .where(and(eq(battleVotes.battleId, battleId), eq(battleVotes.userId, user.id)))
      .limit(1);

    if (existingVote) {
      if (existingVote.votedFor === votedFor) {
        return NextResponse.json({ message: 'Already voted for this contender', userVote: votedFor });
      }

      // Switch vote
      await writeDb
        .update(battleVotes)
        .set({ votedFor })
        .where(and(eq(battleVotes.battleId, battleId), eq(battleVotes.userId, user.id)));

      if (votedFor === 'A') {
        await writeDb
          .update(roastBattles)
          .set({
            channelAVotes: sql`${roastBattles.channelAVotes} + 1`,
            channelBVotes: sql`GREATEST(0, ${roastBattles.channelBVotes} - 1)`,
          })
          .where(eq(roastBattles.id, battleId));
      } else {
        await writeDb
          .update(roastBattles)
          .set({
            channelBVotes: sql`${roastBattles.channelBVotes} + 1`,
            channelAVotes: sql`GREATEST(0, ${roastBattles.channelAVotes} - 1)`,
          })
          .where(eq(roastBattles.id, battleId));
      }
    } else {
      // First vote
      await writeDb.insert(battleVotes).values({
        battleId,
        userId: user.id,
        votedFor,
      });

      if (votedFor === 'A') {
        await writeDb
          .update(roastBattles)
          .set({ channelAVotes: sql`${roastBattles.channelAVotes} + 1` })
          .where(eq(roastBattles.id, battleId));
      } else {
        await writeDb
          .update(roastBattles)
          .set({ channelBVotes: sql`${roastBattles.channelBVotes} + 1` })
          .where(eq(roastBattles.id, battleId));
      }
    }

    // Return updated counts
    const [updated] = await getReadDb().select().from(roastBattles).where(eq(roastBattles.id, battleId)).limit(1);

    return NextResponse.json({
      success: true,
      userVote: votedFor,
      channelAVotes: updated?.channelAVotes || 0,
      channelBVotes: updated?.channelBVotes || 0,
    });
  } catch (err: any) {
    console.error('[battles/vote] Error casting vote:', err);
    return NextResponse.json({ error: 'Failed to cast battle vote' }, { status: 500 });
  }
}
