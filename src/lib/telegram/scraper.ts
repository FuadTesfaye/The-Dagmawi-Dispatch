import * as cheerio from "cheerio";
import { writeDb, withReadDb } from "@/db";
import { posts, ingestionCursor } from "@/db/schema";
import { eq } from "drizzle-orm";
import { scrapePool } from "@/lib/concurrency-pool";

const envInt = (key: string, fallback: number) => {
  const n = Number(process.env[key]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/** Min ms between web-preview refreshes for a channel that already has posts. */
const SCRAPE_TTL_MS = envInt("SCRAPE_TTL_MS", 120_000);

const lastScrapedAt = new Map<string, number>();
const inflightScrapes = new Map<string, Promise<number>>();

/**
 * Rapidly scrapes the public Telegram web preview for a channel (https://t.me/s/channel)
 * This doesn't require MTProto auth or background workers and works instantly for public channels.
 */
export async function scrapePublicChannelFast(channel: string): Promise<number> {
  const cleanChannel = channel.replace(/^@/, "");

  const inflight = inflightScrapes.get(cleanChannel);
  if (inflight) return inflight;

  const work = scrapePool.run(() => scrapePublicChannelFastImpl(cleanChannel));
  inflightScrapes.set(cleanChannel, work);

  try {
    const inserted = await work;
    lastScrapedAt.set(cleanChannel, Date.now());
    return inserted;
  } finally {
    inflightScrapes.delete(cleanChannel);
  }
}

async function scrapePublicChannelFastImpl(cleanChannel: string): Promise<number> {
  const url = `https://t.me/s/${cleanChannel}`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      signal: AbortSignal.timeout(envInt("SCRAPE_FETCH_TIMEOUT_MS", 12_000)),
    });

    if (!response.ok) {
      return 0;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const messageBlocks = $(".tgme_widget_message");
    if (messageBlocks.length === 0) return 0;

    let highestId = 0;
    const newPosts: (typeof posts.$inferInsert)[] = [];

    messageBlocks.each((_i, el) => {
      const $el = $(el);

      const dataPost = $el.attr("data-post");
      if (!dataPost) return;
      const parts = dataPost.split("/");
      if (parts.length !== 2) return;
      const msgId = parseInt(parts[1], 10);
      if (isNaN(msgId)) return;

      if (msgId > highestId) highestId = msgId;

      const $textEl = $el.find(".tgme_widget_message_text");
      let text = "";
      if ($textEl.length > 0) {
        $textEl.find("br").replaceWith("\n");
        text = $textEl.text().trim();
      }

      const timeDatetime = $el.find(".tgme_widget_message_date time").attr("datetime");
      if (!timeDatetime) return;
      const dateObj = new Date(timeDatetime);

      const localDateOffset = 3 * 60 * 60 * 1000;
      const eatDate = new Date(dateObj.getTime() + localDateOffset);
      const localDateStr = eatDate.toISOString().split("T")[0];

      let mediaType = "none";
      if ($el.find(".tgme_widget_message_photo").length > 0) mediaType = "photo";
      else if ($el.find(".tgme_widget_message_video").length > 0) mediaType = "video";
      else if ($el.find(".tgme_widget_message_document").length > 0) mediaType = "document";

      // Forwarded from detection
      const $fwd = $el.find(".tgme_widget_message_forwarded_from");
      let forwardFrom: {
        name: string;
        channel?: string;
        postId?: number;
        url?: string;
      } | undefined = undefined;

      if ($fwd.length > 0) {
        const $fwdName = $fwd.find(".tgme_widget_message_forwarded_from_name");
        const name = $fwdName.text().trim() || $fwd.text().replace(/Forwarded from/i, "").trim();
        const href = $fwdName.attr("href") || $fwd.find("a").attr("href");
        let fwdChannel: string | undefined;
        let fwdPostId: number | undefined;

        if (href) {
          const match = href.match(/t\.me\/([^/]+)(?:\/(\d+))?/);
          if (match) {
            fwdChannel = match[1];
            if (match[2]) fwdPostId = parseInt(match[2], 10);
          }
        }

        if (name || fwdChannel) {
          forwardFrom = {
            name: name || (fwdChannel ? `@${fwdChannel}` : "Forwarded Source"),
            channel: fwdChannel,
            postId: fwdPostId,
            url: href || (fwdChannel ? `https://t.me/${fwdChannel}` : undefined),
          };
        }
      }

      // Reply-to detection
      const $reply = $el.find(".tgme_widget_message_reply");
      let replyTo: {
        id?: number;
        channel?: string;
        authorName?: string;
        text?: string;
        url?: string;
      } | undefined = undefined;

      if ($reply.length > 0) {
        const replyHref = $reply.attr("href");
        const replyAuthor = $reply.find(".tgme_widget_message_author_name").text().trim();
        const replyText = $reply.find(".tgme_widget_message_text").text().trim();
        let replyId: number | undefined;
        let replyChannel: string | undefined;

        if (replyHref) {
          const match = replyHref.match(/t\.me\/([^/]+)\/(\d+)/);
          if (match) {
            replyChannel = match[1];
            replyId = parseInt(match[2], 10);
          }
        }

        replyTo = {
          id: replyId,
          channel: replyChannel || cleanChannel,
          authorName: replyAuthor || undefined,
          text: replyText || undefined,
          url: replyHref || (replyId ? `https://t.me/${cleanChannel}/${replyId}` : undefined),
        };
      }

      newPosts.push({
        channel: cleanChannel,
        id: msgId,
        date: dateObj,
        local_date: localDateStr,
        text,
        media_type: mediaType,
        has_caption_only: hasCaptionOnly,
        permalink,
        raw_json: {
          source: "web_preview",
          forwardFrom,
          replyTo,
        },
      });
    });

    if (newPosts.length > 0) {
      await writeDb
        .insert(posts)
        .values(newPosts)
        .onConflictDoNothing({ target: [posts.channel, posts.id] })
        .execute();
    }

    if (highestId > 0) {
      const cursor = await withReadDb((db) =>
        db.select().from(ingestionCursor).where(eq(ingestionCursor.id, cleanChannel)).execute(),
      );
      const lastMessageId = cursor.length > 0 ? cursor[0].last_message_id : 0;

      if (highestId > lastMessageId) {
        await writeDb
          .insert(ingestionCursor)
          .values({
            id: cleanChannel,
            last_message_id: highestId,
            last_synced_at: new Date(),
          })
          .onConflictDoUpdate({
            target: ingestionCursor.id,
            set: { last_message_id: highestId, last_synced_at: new Date() },
          });
      }
    }

    return newPosts.length;
  } catch {
    return 0;
  }
}

/**
 * Ensures the channel has posts in the DB.
 * Scrapes at most once per SCRAPE_TTL_MS (default 2 min) unless force=true.
 * Concurrent requests for the same channel share one in-flight scrape.
 */
export async function ensureChannelScraped(channel: string, options?: { force?: boolean }) {
  const cleanChannel = channel.replace(/^@/, "");

  if (!options?.force) {
    const last = lastScrapedAt.get(cleanChannel);
    if (last && Date.now() - last < SCRAPE_TTL_MS) {
      return;
    }
  }

  await scrapePublicChannelFast(cleanChannel);
}

/** Test helper: reset in-memory scrape state between runs. */
export function resetScrapeCacheForTest(): void {
  lastScrapedAt.clear();
  inflightScrapes.clear();
}
