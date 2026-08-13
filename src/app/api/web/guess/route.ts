import { NextResponse } from "next/server";
import { readDb, writeDb } from "@/db";
import { guesses, posts } from "@/db/schema";
import { eq, and } from "drizzle-orm";

function getEATDateStr() {
  return new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().split("T")[0];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const channel = searchParams.get("channel") || "dagmawi_babi";
  const date = getEATDateStr();

  const [todayGuesses, dayPosts] = await Promise.all([
    readDb().select().from(guesses).where(and(eq(guesses.local_date, date), eq(guesses.channel, channel))).execute(),
    readDb().select().from(posts).where(and(eq(posts.local_date, date), eq(posts.channel, channel))).execute(),
  ]);

  const actualCount = dayPosts.length;
  const sorted = todayGuesses
    .map((g) => ({ ...g, diff: Math.abs(g.guess - actualCount) }))
    .sort((a, b) => a.diff - b.diff);

  return NextResponse.json({ guesses: sorted, actualCount, date, channel });
}

export async function POST(request: Request) {
  try {
    const { channel = "dagmawi_babi", displayName, guess } = await request.json();
    const date = getEATDateStr();
    const userId = `web:${displayName.toLowerCase().replace(/\s+/g, "_")}`;
    const guessId = `${channel}:${date}:${userId}`;

    if (typeof guess !== "number" || guess < 0 || guess > 200) {
      return NextResponse.json({ error: "Guess must be 0–200" }, { status: 400 });
    }

    await writeDb.insert(guesses).values({
      id: guessId,
      channel,
      local_date: date,
      telegram_user_id: userId,
      display_name: displayName,
      guess,
    }).onConflictDoUpdate({
      target: guesses.id,
      set: { guess, display_name: displayName },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
