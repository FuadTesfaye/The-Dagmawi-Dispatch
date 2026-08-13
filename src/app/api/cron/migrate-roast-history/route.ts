import { NextResponse } from "next/server";
import { writeDb } from "@/db";
import { sql } from "drizzle-orm";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    await writeDb.execute(sql`
      CREATE TABLE IF NOT EXISTS roast_history (
        id SERIAL PRIMARY KEY,
        channel VARCHAR(100) NOT NULL,
        line TEXT NOT NULL,
        kind VARCHAR(20) NOT NULL DEFAULT 'daily',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await writeDb.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_roast_history_channel_created
      ON roast_history (channel, created_at DESC)
    `);

    return NextResponse.json({ ok: true, message: "roast_history ready" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
