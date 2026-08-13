import { NextResponse } from "next/server";
import { summarizeDay, SUMMARY_LANGUAGE } from "@/lib/summarize";
import { handlerPool } from "@/lib/concurrency-pool";

export const maxDuration = 60;

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
    const summary = await handlerPool.run(() =>
      summarizeDay(channel, date, SUMMARY_LANGUAGE, false)
    );
    return NextResponse.json({ summary, date, channel });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
