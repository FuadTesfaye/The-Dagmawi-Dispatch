import { NextResponse } from "next/server";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

function getEATDateStr(offsetDays = 0) {
  const eat = new Date(Date.now() + 3 * 60 * 60 * 1000);
  eat.setDate(eat.getDate() + offsetDays);
  return eat.toISOString().split("T")[0];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const channel = searchParams.get("channel") || "dagmawi_babi";
  const date = searchParams.get("date") || getEATDateStr(0);

  try {
    const dayPosts = await db.select({
      id: posts.id,
      date: posts.date,
      text: posts.text,
      media_type: posts.media_type,
      local_date: posts.local_date,
    }).from(posts)
      .where(and(eq(posts.local_date, date), eq(posts.channel, channel)))
      .orderBy(desc(posts.date))
      .limit(50)
      .execute();

    return NextResponse.json({ posts: dayPosts, date, channel });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
