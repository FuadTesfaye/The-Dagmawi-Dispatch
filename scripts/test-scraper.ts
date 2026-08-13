import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { scrapePublicChannelFast, ensureChannelScraped } from "../src/lib/telegram/scraper";
import { db } from "../src/db";
import { posts } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function run() {
  console.log("Starting quick web scrape test on @sifendev...");
  const inserted = await scrapePublicChannelFast("sifendev");
  console.log(`Scraper reported ~${inserted} posts inserted or touched.`);

  const fetched = await db.select().from(posts).where(eq(posts.channel, "sifendev")).execute();
  console.log(`Database now has ${fetched.length} posts for sifendev.`);
  
  if (fetched.length > 0) {
    console.log("Sample post:");
    console.log(fetched[0].text);
  }

  process.exit(0);
}

run().catch(console.error);
