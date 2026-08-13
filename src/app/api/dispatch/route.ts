import { NextRequest, NextResponse } from "next/server";
import { readDb } from "@/db";
import { posts, dailySummaries } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { summarizeDay, SUMMARY_LANGUAGE } from "@/lib/summarize";
import { generatePersonalizedRoast } from "@/lib/roasts";
import { handlerPool } from "@/lib/concurrency-pool";
import { toHumanError } from "@/lib/human-errors";

function getEATDateStr(offsetDays = 0) {
  const now = new Date();
  const eat = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  eat.setDate(eat.getDate() + offsetDays);
  return eat.toISOString().split("T")[0];
}

export async function GET(request: NextRequest) {
  const channelParam = request.nextUrl.searchParams.get("channel");
  const channel = (channelParam || "dagmawi_babi").replace(/^@/, "").trim();

  if (!channel) {
    return NextResponse.json({ error: "Channel username is required." }, { status: 400 });
  }

  try {
    return await handlerPool.run(async () => {
    const todayDate = getEATDateStr(0);
    const yesterdayDate = getEATDateStr(-1);

    const [todayPosts, yesterdayPosts, todaySummaryRow, yesterdaySummaryRow] = await Promise.all([
      readDb().select().from(posts).where(and(eq(posts.channel, channel), eq(posts.local_date, todayDate))).execute(),
      readDb().select().from(posts).where(and(eq(posts.channel, channel), eq(posts.local_date, yesterdayDate))).execute(),
      readDb().select().from(dailySummaries).where(and(eq(dailySummaries.channel, channel), eq(dailySummaries.local_date, todayDate))).execute(),
      readDb().select().from(dailySummaries).where(and(eq(dailySummaries.channel, channel), eq(dailySummaries.local_date, yesterdayDate))).execute(),
    ]);

    const [todaySummary, yesterdaySummary, roast] = await Promise.all([
      todaySummaryRow[0]?.language === SUMMARY_LANGUAGE ? todaySummaryRow[0].summary_text : summarizeDay(channel, todayDate, SUMMARY_LANGUAGE, false),
      yesterdaySummaryRow[0]?.language === SUMMARY_LANGUAGE ? yesterdaySummaryRow[0].summary_text : summarizeDay(channel, yesterdayDate, SUMMARY_LANGUAGE, false),
      generatePersonalizedRoast(channel),
    ]);

    return NextResponse.json({
      channel,
      todayDate,
      yesterdayDate,
      todayCount: todayPosts.length,
      yesterdayCount: yesterdayPosts.length,
      todaySummary,
      yesterdaySummary,
      roast,
    });
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: toHumanError(error, "api") }, { status: 500 });
  }
}
