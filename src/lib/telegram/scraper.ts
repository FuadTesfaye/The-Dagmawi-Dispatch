import * as cheerio from "cheerio";
import { writeDb, withReadDb } from "@/db";
import { posts, ingestionCursor } from "@/db/schema";
import { eq } from "drizzle-orm";
import { scrapePool } from "@/lib/concurrency-pool";

/**
 * Rapidly scrapes the public Telegram web preview for a channel (https://t.me/s/channel)
 * This doesn't require MTProto auth or background workers and works instantly for public channels.
 * It's ideal for "on-demand" fetching when a channel is first added.
 */
export async function scrapePublicChannelFast(channel: string): Promise<number> {
  return scrapePool.run(() => scrapePublicChannelFastImpl(channel));
}

async function scrapePublicChannelFastImpl(channel: string): Promise<number> {
  const cleanChannel = channel.replace(/^@/, "");
  const url = `https://t.me/s/${cleanChannel}`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });

    if (!response.ok) {
      return 0;
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Find all message blocks
    const messageBlocks = $(".tgme_widget_message");
    if (messageBlocks.length === 0) return 0;
    
    let inserted = 0;
    let highestId = 0;

    const newPosts: any[] = [];

    messageBlocks.each((i, el) => {
      const $el = $(el);
      
      // Get message ID
      const dataPost = $el.attr("data-post"); // e.g., "sifendev/123"
      if (!dataPost) return;
      const parts = dataPost.split("/");
      if (parts.length !== 2) return;
      const msgId = parseInt(parts[1], 10);
      if (isNaN(msgId)) return;
      
      if (msgId > highestId) highestId = msgId;

      // Extract text content
      const $textEl = $el.find(".tgme_widget_message_text");
      let text = "";
      if ($textEl.length > 0) {
        // Replace <br> with newlines for cleaner text
        $textEl.find("br").replaceWith("\n");
        text = $textEl.text().trim();
      }

      // Extract date
      const timeDatetime = $el.find(".tgme_widget_message_date time").attr("datetime");
      if (!timeDatetime) return;
      const dateObj = new Date(timeDatetime);
      
      // Convert to EAT (UTC+3)
      const localDateOffset = 3 * 60 * 60 * 1000;
      const eatDate = new Date(dateObj.getTime() + localDateOffset);
      const localDateStr = eatDate.toISOString().split('T')[0];
      
      // Detect media type
      let mediaType = "none";
      if ($el.find(".tgme_widget_message_photo").length > 0) mediaType = "photo";
      else if ($el.find(".tgme_widget_message_video").length > 0) mediaType = "video";
      else if ($el.find(".tgme_widget_message_document").length > 0) mediaType = "document";

      const hasCaptionOnly = !!mediaType && !!text;
      const permalink = `https://t.me/${cleanChannel}/${msgId}`;

      newPosts.push({
        channel: cleanChannel,
        id: msgId,
        date: dateObj,
        local_date: localDateStr,
        text: text,
        media_type: mediaType,
        has_caption_only: hasCaptionOnly,
        permalink: permalink,
        raw_json: { source: "web_preview" },
      });
    });

    // Insert all collected posts ignoring conflicts
    for (const post of newPosts) {
      const res = await writeDb.insert(posts).values(post).onConflictDoNothing({ target: [posts.channel, posts.id] }).execute();
      // If affectedRows exists and is > 0, we inserted it (varies by DB driver, so we just increment loosely)
      // For simplicity, we just count them.
      inserted++;
    }

    // Update cursor if we got a new high ID
    if (highestId > 0) {
      const cursor = await withReadDb((db) =>
        db.select().from(ingestionCursor).where(eq(ingestionCursor.id, cleanChannel)).execute()
      );
      const lastMessageId = cursor.length > 0 ? cursor[0].last_message_id : 0;
      
      if (highestId > lastMessageId) {
        await writeDb.insert(ingestionCursor).values({
          id: cleanChannel,
          last_message_id: highestId,
          last_synced_at: new Date()
        }).onConflictDoUpdate({
          target: ingestionCursor.id,
          set: { last_message_id: highestId, last_synced_at: new Date() }
        });
      }
    }

    return inserted; 

  } catch {
    return 0;
  }
}

/**
 * Ensures the channel has at least some posts in the DB.
 * If not, it rapidly scrapes the public web preview.
 * This guarantees that new channels aren't immediately met with "Silence from the throne."
 */
export async function ensureChannelScraped(channel: string) {
  const cleanChannel = channel.replace(/^@/, "");
  
  // Check if we have any posts at all for this channel
  const existingPosts = await withReadDb((db) =>
    db.select({ id: posts.id })
      .from(posts)
      .where(eq(posts.channel, cleanChannel))
      .limit(1)
      .execute()
  );
    
  if (existingPosts.length === 0) {
    await scrapePublicChannelFast(cleanChannel);
  } else {
    await scrapePublicChannelFast(cleanChannel);
  }
}
