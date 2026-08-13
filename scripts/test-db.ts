import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "./src/db";
import { posts, dailySummaries, ingestionCursor } from "./src/db/schema";
import { eq, desc } from "drizzle-orm";

async function run() {
  const channelPosts = await db.select().from(posts).where(eq(posts.channel, "sifendev")).orderBy(desc(posts.date)).execute();
  console.log(`Found ${channelPosts.length} posts for sifendev.`);
  for (const p of channelPosts.slice(0, 5)) {
    console.log(`- ${p.local_date} | ${p.text.substring(0, 50)}...`);
  }

  const cursor = await db.select().from(ingestionCursor).where(eq(ingestionCursor.id, "sifendev")).execute();
  console.log("Cursor:", cursor);

  const summaries = await db.select().from(dailySummaries).where(eq(dailySummaries.id, "sifendev:2026-08-12")).execute();
  console.log("Summary for 2026-08-12:", summaries);

  process.exit(0);
}

run().catch(console.error);
