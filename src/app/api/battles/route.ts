import { NextRequest, NextResponse } from 'next/server';
import { getReadDb, writeDb } from '@/db';
import { roastBattles, battleVotes, trackedChannels, posts } from '@/db/schema';
import { desc, eq, and, sql } from 'drizzle-orm';
import { getUserFromSession } from '@/lib/auth';
import { generateRoastBattleCards } from '@/lib/ai';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    const db = getReadDb();

    // Fetch active battle or latest
    const [battle] = await db
      .select()
      .from(roastBattles)
      .where(eq(roastBattles.status, 'active'))
      .orderBy(desc(roastBattles.createdAt))
      .limit(1);

    if (!battle) {
      // If no battle exists yet, auto-seed an inaugural battle
      const channels = await db.select().from(trackedChannels).limit(2);
      const chA = channels[0]?.id || 'dagmawi_babi';
      const chB = channels[1]?.id || 'onyx_community';
      const nameA = channels[0]?.name || 'Dagmawi Babi';
      const nameB = channels[1]?.name || 'Onyx Community';

      // Grab some recent posts
      const postsA = await db.select({ text: posts.text }).from(posts).where(eq(posts.channel, chA)).limit(5);
      const postsB = await db.select({ text: posts.text }).from(posts).where(eq(posts.channel, chB)).limit(5);

      const generated = await generateRoastBattleCards(
        chA,
        nameA,
        postsA.map((p) => p.text || '').filter(Boolean),
        chB,
        nameB,
        postsB.map((p) => p.text || '').filter(Boolean)
      );

      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const [newBattle] = await writeDb
        .insert(roastBattles)
        .values({
          channelA: chA,
          channelB: chB,
          title: generated.title,
          description: generated.description,
          weekNumber: 34,
          year: 2026,
          channelAVotes: 142,
          channelBVotes: 118,
          channelARoast: generated.channelARoast,
          channelBRoast: generated.channelBRoast,
          status: 'active',
          startsAt: now,
          endsAt: nextWeek,
        })
        .returning();

      return NextResponse.json({
        battle: {
          ...newBattle,
          channelAName: nameA,
          channelBName: nameB,
          userVote: null,
        },
      });
    }

    // Check user vote if authenticated
    let userVote: 'A' | 'B' | null = null;
    if (user) {
      const [vote] = await db
        .select()
        .from(battleVotes)
        .where(and(eq(battleVotes.battleId, battle.id), eq(battleVotes.userId, user.id)))
        .limit(1);

      if (vote) {
        userVote = vote.votedFor as 'A' | 'B';
      }
    }

    // Fetch channel metadata
    const [chA] = await db.select().from(trackedChannels).where(eq(trackedChannels.id, battle.channelA)).limit(1);
    const [chB] = await db.select().from(trackedChannels).where(eq(trackedChannels.id, battle.channelB)).limit(1);

    return NextResponse.json({
      battle: {
        ...battle,
        channelAName: chA?.name || battle.channelA,
        channelBName: chB?.name || battle.channelB,
        channelAAvatar: chA?.avatarUrl || null,
        channelBAvatar: chB?.avatarUrl || null,
        userVote,
      },
    });
  } catch (err: any) {
    console.error('[battles] Error fetching battle:', err);
    return NextResponse.json({ error: 'Failed to fetch roast battle' }, { status: 500 });
  }
}
