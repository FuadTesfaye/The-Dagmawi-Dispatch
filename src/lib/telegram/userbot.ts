import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions";
import { db } from "@/db";
import { posts, ingestionCursor, userChannels } from "@/db/schema";
import { eq } from "drizzle-orm";

const apiId = parseInt(process.env.TELEGRAM_API_ID!);
const apiHash = process.env.TELEGRAM_API_HASH!;
const sessionString = process.env.TELEGRAM_USERBOT_SESSION!;

// Helper to delay
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchNewMessages() {
  const stringSession = new StringSession(sessionString);
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.connect();

  try {
    // Determine which channels to scrape
    const channelsResult = await db.select({ channel: userChannels.channel }).from(userChannels).execute();
    const channels = new Set(channelsResult.map(c => c.channel));
    channels.add("dagmawi_babi"); // Always include default

    let totalInserted = 0;

    for (const channelUsername of channels) {
      // Remove @ if present
      const cleanChannelUsername = channelUsername.replace(/^@/, "");

      try {
        // Get cursor
        const cursor = await db.select().from(ingestionCursor).where(eq(ingestionCursor.id, cleanChannelUsername)).execute();
        const lastMessageId = cursor.length > 0 ? cursor[0].last_message_id : 0;

        // Try to join the channel if not already joined
        try {
          await client.invoke(new Api.channels.JoinChannel({ channel: cleanChannelUsername }));
        } catch (joinErr: any) {
          // Ignore errors if already joined or if it fails (it will just try to read publicly)
        }

        // Fetch messages
        const messages = await client.getMessages(cleanChannelUsername, {
          minId: lastMessageId,
          limit: 100, // Process in batches of 100
        });

        if (messages.length === 0) {
          continue; // Move to next channel
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
          const permalink = `https://t.me/${cleanChannelUsername}/${msg.id}`;
          
          // Insert or ignore if exists
          await db.insert(posts).values({
            channel: cleanChannelUsername,
            id: msg.id,
            date: date,
            local_date: localDateStr,
            text: msg.message || "",
            media_type: mediaType,
            has_caption_only: hasCaptionOnly,
            permalink: permalink,
            raw_json: JSON.parse(JSON.stringify(msg)), // Basic serialization
          }).onConflictDoNothing({ target: [posts.channel, posts.id] });
          
          inserted++;
        }

        totalInserted += inserted;

        // Update cursor
        if (highestId > lastMessageId) {
          await db.insert(ingestionCursor).values({
            id: cleanChannelUsername,
            last_message_id: highestId,
            last_synced_at: new Date()
          }).onConflictDoUpdate({
            target: ingestionCursor.id,
            set: { last_message_id: highestId, last_synced_at: new Date() }
          });
        }
      } catch (channelErr: any) {
        console.error(`Error scraping channel ${channelUsername}:`, channelErr);
      }
      
      // Sleep briefly between channels to avoid rate limits
      await sleep(1000);
    }

    await client.disconnect();
    return { newPosts: totalInserted };

  } catch (err: any) {
    console.error("fetchNewMessages error:", err);
    await client.disconnect();
    
    // Check if it's a flood wait
    if (err.errorMessage && err.errorMessage.startsWith("FLOOD_WAIT_")) {
      console.log(`Flood wait: ${err.errorMessage}`);
      throw new Error(err.errorMessage);
    }
    
    throw err;
  }
}
