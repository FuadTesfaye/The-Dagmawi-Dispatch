import "dotenv/config";
import { fetchNewMessages } from "../src/lib/telegram/userbot";
import { db } from "../src/db";
import { posts, ingestionCursor } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function run() {
  console.log("Starting scrape test...");
  
  try {
    // Delete existing cursor to simulate fresh start
    await db.delete(ingestionCursor).where(eq(ingestionCursor.id, "dagmawi_babi"));
    // Optionally delete old posts if any
    await db.delete(posts);

    const res = await fetchNewMessages();
    console.log("Scrape Result:", res);
    
    // Check how many posts are in DB
    const allPosts = await db.select().from(posts).execute();
    console.log(`Total posts in DB: ${allPosts.length}`);
  } catch (err) {
    console.error("Error during scrape:", err);
  }
  
  process.exit(0);
}

run();
