#!/usr/bin/env npx tsx
/**
 * scrape-to-db.ts
 *
 * Uses teleglance-ts to scrape public Telegram channels and insert new posts
 * into the Dagmawi Dispatch Supabase database.
 *
 * Usage:
 *   npx tsx Scraper/scrape-to-db.ts                     # scrape all channels in channels-list.json
 *   npx tsx Scraper/scrape-to-db.ts <channel_username>   # scrape a single channel
 *   npx tsx Scraper/scrape-to-db.ts --all <username>     # full history scrape for a channel
 */
import { config } from "dotenv";
import { resolve, join } from "node:path";
import { readFileSync } from "node:fs";

// Load env from the parent project
config({ path: resolve(import.meta.dirname, "../.env.local") });

import { TeleGlanceClient } from "./src/client/TeleGlanceClient.js";
import type { Message } from "./src/models/types.js";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  date,
  varchar,
  primaryKey,
} from "drizzle-orm/pg-core";
import { eq } from "drizzle-orm";

// ── DB schema (mirrors ../src/db/schema.ts) ──────────────────────────────────
const posts = pgTable(
  "posts",
  {
    channel: varchar("channel", { length: 100 }).notNull().default("dagmawi_babi"),
    id: integer("id").notNull(),
    date: timestamp("date", { withTimezone: true }).notNull(),
    local_date: date("local_date").notNull(),
    text: text("text"),
    media_type: varchar("media_type", { length: 50 }).notNull().default("none"),
    has_caption_only: boolean("has_caption_only").default(false),
    permalink: text("permalink"),
    raw_json: jsonb("raw_json"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.channel, table.id] }),
  })
);

const ingestionCursor = pgTable("ingestion_cursor", {
  id: varchar("id", { length: 50 }).primaryKey(),
  last_message_id: integer("last_message_id").notNull(),
  last_synced_at: timestamp("last_synced_at", { withTimezone: true }).defaultNow(),
});

// ── DB connection ────────────────────────────────────────────────────────────
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("❌ DATABASE_URL not found in .env.local");
  process.exit(1);
}

const sql = postgres(databaseUrl, { prepare: false, max: 5, idle_timeout: 20 });
const db = drizzle(sql);

// ── Channels list ────────────────────────────────────────────────────────────
interface ChannelEntry {
  title: string;
  username: string | null;
  id: string;
}

function loadChannelsList(): ChannelEntry[] {
  const channelsPath = resolve(import.meta.dirname, "../channels-list.json");
  try {
    return JSON.parse(readFileSync(channelsPath, "utf-8"));
  } catch {
    console.error("❌ Could not load channels-list.json");
    return [];
  }
}

// ── Convert teleglance Message → DB row ──────────────────────────────────────
function messageToRow(msg: Message, channelUsername: string) {
  const dateObj = new Date(msg.date);
  const localDateOffset = 3 * 60 * 60 * 1000; // EAT (UTC+3)
  const eatDate = new Date(dateObj.getTime() + localDateOffset);
  const localDateStr = eatDate.toISOString().split("T")[0];

  let mediaType = "none";
  if (msg.media.length > 0) {
    const firstMedia = msg.media[0];
    if (firstMedia.type === "photo") mediaType = "photo";
    else if (firstMedia.type === "video") mediaType = "video";
    else mediaType = "other";
  }

  const hasCaptionOnly = mediaType !== "none" && !!msg.text;
  const permalink = `https://t.me/${channelUsername}/${msg.id}`;

  return {
    channel: channelUsername,
    id: msg.id,
    date: dateObj,
    local_date: localDateStr,
    text: msg.text || "",
    media_type: mediaType,
    has_caption_only: hasCaptionOnly,
    permalink,
    raw_json: { source: "teleglance", rawHtml: msg.rawHtml },
  };
}

// ── Scrape new posts for a channel ───────────────────────────────────────────
async function scrapeNewPosts(
  client: TeleGlanceClient,
  channelUsername: string
): Promise<number> {
  console.log(`\n📡 Scraping @${channelUsername}...`);

  try {
    const rows: (typeof posts.$inferInsert)[] = [];
    let highestId = 0;
    let count = 0;

    // iterMessages fetches the latest ~20 posts from the web preview
    for await (const msg of client.iterMessages(channelUsername, { limit: 40 })) {
      const row = messageToRow(msg, channelUsername);
      rows.push(row);
      if (msg.id > highestId) highestId = msg.id;
      count++;
    }

    if (rows.length === 0) {
      console.log(`  ⚪ No messages found for @${channelUsername}`);
      return 0;
    }

    // Batch insert, skip conflicts
    await db.insert(posts).values(rows).onConflictDoNothing({ target: [posts.channel, posts.id] });

    // Update ingestion cursor
    if (highestId > 0) {
      const existing = await db
        .select()
        .from(ingestionCursor)
        .where(eq(ingestionCursor.id, channelUsername))
        .execute();

      const lastMessageId = existing.length > 0 ? existing[0].last_message_id : 0;

      if (highestId > lastMessageId) {
        await db
          .insert(ingestionCursor)
          .values({
            id: channelUsername,
            last_message_id: highestId,
            last_synced_at: new Date(),
          })
          .onConflictDoUpdate({
            target: ingestionCursor.id,
            set: { last_message_id: highestId, last_synced_at: new Date() },
          });
      }
    }

    console.log(`  ✅ Inserted up to ${count} posts (highest ID: ${highestId})`);
    return count;
  } catch (err) {
    console.error(`  ❌ Error scraping @${channelUsername}:`, (err as Error).message);
    return 0;
  }
}

// ── Full history scrape for a channel ────────────────────────────────────────
async function scrapeFullHistory(
  client: TeleGlanceClient,
  channelUsername: string
): Promise<number> {
  console.log(`\n📡 Full history scrape for @${channelUsername}...`);

  try {
    let count = 0;
    let highestId = 0;
    let batch: (typeof posts.$inferInsert)[] = [];

    for await (const msg of client.scrapeAll(channelUsername)) {
      const row = messageToRow(msg, channelUsername);
      batch.push(row);
      if (msg.id > highestId) highestId = msg.id;
      count++;

      // Insert in batches of 50
      if (batch.length >= 50) {
        await db
          .insert(posts)
          .values(batch)
          .onConflictDoNothing({ target: [posts.channel, posts.id] });
        process.stdout.write(
          `\r  ${count} messages scraped (latest: #${msg.id} ${new Date(msg.date).toISOString().slice(0, 10)})`
        );
        batch = [];
      }
    }

    // Insert remaining
    if (batch.length > 0) {
      await db
        .insert(posts)
        .values(batch)
        .onConflictDoNothing({ target: [posts.channel, posts.id] });
    }

    // Update cursor
    if (highestId > 0) {
      await db
        .insert(ingestionCursor)
        .values({
          id: channelUsername,
          last_message_id: highestId,
          last_synced_at: new Date(),
        })
        .onConflictDoUpdate({
          target: ingestionCursor.id,
          set: { last_message_id: highestId, last_synced_at: new Date() },
        });
    }

    console.log(`\n  ✅ Done! ${count} messages scraped for @${channelUsername}`);
    return count;
  } catch (err) {
    console.error(`\n  ❌ Error scraping @${channelUsername}:`, (err as Error).message);
    return 0;
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const fullHistory = args.includes("--all");
  const channelArg = args.find((a) => !a.startsWith("--"));

  const client = new TeleGlanceClient({
    storeDir: false, // Don't save to local JSON — we write to Supabase
    timeoutMs: 15_000,
    maxRetries: 3,
  });

  let totalPosts = 0;

  if (channelArg) {
    // Single channel mode
    const username = channelArg.replace(/^@/, "");
    if (fullHistory) {
      totalPosts = await scrapeFullHistory(client, username);
    } else {
      totalPosts = await scrapeNewPosts(client, username);
    }
  } else {
    // All channels mode
    const channels = loadChannelsList();
    const scrapable = channels.filter((c) => c.username !== null);

    console.log(`🚀 Scraping ${scrapable.length} public channels...\n`);

    for (const channel of scrapable) {
      const inserted = await scrapeNewPosts(client, channel.username!);
      totalPosts += inserted;

      // Small delay between channels to be polite to t.me
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  console.log(`\n🏁 Scraping complete. Total posts processed: ${totalPosts}`);
  await sql.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
