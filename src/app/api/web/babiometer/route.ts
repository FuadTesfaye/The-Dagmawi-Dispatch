import { NextResponse } from "next/server";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { eq, and } from "drizzle-orm";

function getEATDateStr() {
  return new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().split("T")[0];
}

function getLevel(count: number, isBabi: boolean) {
  if (count === 0) return { blasts: 0, label: "Silent", verdict: isBabi ? "Total silence. Either sleeping, meditating, or WiFi is down." : "Total silence. A peaceful day.", emoji: "💤" };
  if (count <= 3) return { blasts: 1, label: "Whisper", verdict: isBabi ? "A whisper from the throne. He's warming up." : "Low activity. Just a few decrees.", emoji: "😌" };
  if (count <= 8) return { blasts: 2, label: "Active", verdict: isBabi ? "A normal person's entire week of content. For Babi, this is a slow morning." : "Moderate activity. The channel is alive.", emoji: "📝" };
  if (count <= 15) return { blasts: 3, label: "Loud", verdict: isBabi ? "The scrolls are piling up. Notifications are crying for mercy." : "High activity. The scribe's hand is cramping.", emoji: "📢" };
  if (count <= 25) return { blasts: 4, label: "Chaos", verdict: isBabi ? "CODE ORANGE. He's in his zone. Your 'mark as read' button is filing a restraining order." : "Heavy deluge. Notifications incoming.", emoji: "🔥" };
  if (count <= 40) return { blasts: 5, label: "DEFCON 2", verdict: isBabi ? "DEFCON 2. Babi has entered hyperdrive. Pray for your battery." : "EXTREME VOLUME. Take cover.", emoji: "🚨" };
  return { blasts: 6, label: "DEFCON 1", verdict: isBabi ? "DEFCON 1. HE'S COMPOSING A NOVEL. Abandon your phone. Touch grass." : "Absolute chaos. A novel has been written.", emoji: "☠️" };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const channel = searchParams.get("channel") || "dagmawi_babi";
  const date = getEATDateStr();

  try {
    const dayPosts = await db.select().from(posts)
      .where(and(eq(posts.local_date, date), eq(posts.channel, channel)))
      .execute();

    const count = dayPosts.length;
    const level = getLevel(count, channel.toLowerCase() === "dagmawi_babi");
    return NextResponse.json({ count, date, channel, ...level });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
