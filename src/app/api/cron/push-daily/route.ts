import { db } from "@/db";
import { subscribers, dailySummaries } from "@/db/schema";
import { eq } from "drizzle-orm";
import { bot } from "@/lib/bot";
import { NextResponse } from "next/server";

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    // Get yesterday's date in EAT
    const date = new Date();
    const localDateOffset = 3 * 60 * 60 * 1000;
    const eatDate = new Date(date.getTime() + localDateOffset);
    eatDate.setDate(eatDate.getDate() - 1);
    const localDateStr = eatDate.toISOString().split('T')[0];

    // Fetch the summary for yesterday
    const summaries = await db.select().from(dailySummaries).where(eq(dailySummaries.local_date, localDateStr)).execute();
    if (summaries.length === 0) {
      return NextResponse.json({ message: "No summary available to push for yesterday." });
    }

    const summaryText = summaries[0].summary_text;

    // Fetch active subscribers
    const activeSubscribers = await db.select().from(subscribers).where(eq(subscribers.active, true)).execute();

    let sent = 0;
    let failed = 0;

    for (const sub of activeSubscribers) {
      try {
        await bot.api.sendMessage(
          sub.chat_id,
          `📅 **Daily Digest for ${localDateStr}:**\n\n${summaryText}`,
          { parse_mode: "Markdown" }
        );
        sent++;
      } catch (err) {
        console.error(`Failed to send to ${sub.chat_id}:`, err);
        failed++;
      }
      
      // Basic rate limiting to prevent hitting Telegram API limits
      await sleep(100);
    }

    return NextResponse.json({ sent, failed });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
