import { summarizeDay } from "@/lib/summarize";
import { NextResponse } from "next/server";

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
    eatDate.setDate(eatDate.getDate() - 1); // Yesterday
    const localDateStr = eatDate.toISOString().split('T')[0];

    const summary = await summarizeDay("dagmawi_babi", localDateStr, "am", false);
    
    return NextResponse.json({ date: localDateStr, summaryLength: summary.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
