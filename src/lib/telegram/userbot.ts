import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { db } from "@/db";
import { posts, ingestionCursor } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { Api } from "telegram";

const apiId = parseInt(process.env.TELEGRAM_API_ID!);
const apiHash = process.env.TELEGRAM_API_HASH!;
const sessionString = process.env.TELEGRAM_USERBOT_SESSION!;
const channelUsername = "Dagmawi_Babi"; // The target channel

// Helper to delay
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchNewMessages() {
  const stringSession = new StringSession(sessionString);
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.connect();

  try {
    // Get cursor
    let cursor = await db.select().from(ingestionCursor).where(eq(ingestionCursor.id, channelUsername)).execute();
    let lastMessageId = cursor.length > 0 ? cursor[0].last_message_id : 0;

    // Fetch messages
    // Note: getMessages fetches latest messages. If we specify minId, it gets messages newer than minId.
    const messages = await client.getMessages(channelUsername, {
      minId: lastMessageId,
      limit: 100, // Process in batches of 100
    });

    if (messages.length === 0) {
      await client.disconnect();
      return { newPosts: 0 };
    }

    let highestId = lastMessageId;
    let inserted = 0;

    for (const msg of messages) {
      if (msg.id > highestId) {
        highestId = msg.id;
      }

      // We only care about channel posts, not service messages
      if (msg.className !== "Message") continue;
      
      const date = new Date(msg.date * 1000);
      
      // Convert to EAT (UTC+3)
      const localDateOffset = 3 * 60 * 60 * 1000;
      const eatDate = new Date(date.getTime() + localDateOffset);
      const localDateStr = eatDate.toISOString().split('T')[0];
      
      let mediaType = "none";
      if (msg.media) {
        if (msg.media.className === "MessageMediaPhoto") mediaType = "photo";
        else if (msg.media.className === "MessageMediaDocument") mediaType = "video_or_doc";
        else mediaType = "other";
      }

      const hasCaptionOnly = !!msg.media && !!msg.message;
      const permalink = `https://t.me/${channelUsername}/${msg.id}`;
      
      // Insert or ignore if exists
      await db.insert(posts).values({
        id: msg.id,
        date: date,
        local_date: localDateStr,
        text: msg.message || "",
        media_type: mediaType,
        has_caption_only: hasCaptionOnly,
        permalink: permalink,
        raw_json: JSON.parse(JSON.stringify(msg)), // Basic serialization
      }).onConflictDoNothing({ target: posts.id });
      
      inserted++;
    }

    // Update cursor
    if (highestId > lastMessageId) {
      await db.insert(ingestionCursor).values({
        id: channelUsername,
        last_message_id: highestId,
        last_synced_at: new Date()
      }).onConflictDoUpdate({
        target: ingestionCursor.id,
        set: { last_message_id: highestId, last_synced_at: new Date() }
      });
    }

    await client.disconnect();
    return { newPosts: inserted };

  } catch (err: any) {
    console.error(err);
    await client.disconnect();
    
    // Check if it's a flood wait
    if (err.errorMessage === "FLOOD_WAIT_X") {
      console.log(`Flood wait for ${err.seconds} seconds`);
      throw new Error(`FLOOD_WAIT_${err.seconds}`);
    }
    
    throw err;
  }
}
