import "dotenv/config";
import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions";
import { db } from "../src/db";
import { posts, ingestionCursor } from "../src/db/schema";
import { eq, asc, desc } from "drizzle-orm";

const apiId = parseInt(process.env.TELEGRAM_API_ID!);
const apiHash = process.env.TELEGRAM_API_HASH!;
const sessionString = process.env.TELEGRAM_USERBOT_SESSION!;

const channelUsername = process.argv[2];
const limit = parseInt(process.argv[3]) || 500; // How many messages to scrape backwards in total

if (!channelUsername) {
  console.error("Usage: npx tsx scripts/scrape-history.ts <channel_username> [limit]");
  process.exit(1);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  const cleanChannelUsername = channelUsername.replace(/^@/, "");
  console.log(`Starting historical scrape for @${cleanChannelUsername}`);
  console.log(`Targeting up to ${limit} older messages...`);

  const stringSession = new StringSession(sessionString);
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.connect();

  try {
    try {
      await client.invoke(new Api.channels.JoinChannel({ channel: cleanChannelUsername }));
    } catch (e) {
      // Ignore join errors, we can read public channels anyway
    }

    // Find the oldest message ID we have in the DB for this channel
    const oldestPostResult = await db
      .select({ id: posts.id })
      .from(posts)
      .where(eq(posts.channel, cleanChannelUsername))
      .orderBy(asc(posts.id))
      .limit(1)
      .execute();

    let oldestPost = oldestPostResult.length > 0 ? oldestPostResult[0] : null;
    let currentMaxId = oldestPost ? oldestPost.id : 0;
    
    let totalInserted = 0;
    let fetchedThisBatch = 1;

    while (totalInserted < limit && fetchedThisBatch > 0) {
      const batchLimit = Math.min(100, limit - totalInserted);
      
      console.log(`Fetching ${batchLimit} messages older than ID ${currentMaxId > 0 ? currentMaxId : 'latest'}...`);
      
      const args: any = { limit: batchLimit };
      if (currentMaxId > 0) {
        args.maxId = currentMaxId;
      }
      
      const messages = await client.getMessages(cleanChannelUsername, args);
      
      fetchedThisBatch = messages.length;
      if (fetchedThisBatch === 0) {
        console.log("No more historical messages found.");
        break;
      }

      let insertedBatch = 0;
      let minIdInBatch = currentMaxId;

      for (const msg of messages) {
        if (msg.className !== "Message") continue;
        
        if (minIdInBatch === 0 || msg.id < minIdInBatch) {
          minIdInBatch = msg.id;
        }

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
        
        await db.insert(posts).values({
          channel: cleanChannelUsername,
          id: msg.id,
          date: date,
          local_date: localDateStr,
          text: msg.message || "",
          media_type: mediaType,
          has_caption_only: hasCaptionOnly,
          permalink: permalink,
          raw_json: JSON.parse(JSON.stringify(msg)),
        }).onConflictDoNothing({ target: [posts.channel, posts.id] });
        
        insertedBatch++;
        totalInserted++;
      }
      
      currentMaxId = minIdInBatch;
      console.log(`Inserted ${insertedBatch} messages. Total inserted this run: ${totalInserted}`);
      
      if (totalInserted < limit) {
        await sleep(1500); // Sleep to avoid rate limits
      }
    }
    
    // If we started with an empty database for this channel, set the cursor to the newest message
    // so the forward scraper doesn't fetch everything again.
    if (!oldestPost) {
       const newestPostResult = await db
         .select({ id: posts.id })
         .from(posts)
         .where(eq(posts.channel, cleanChannelUsername))
         .orderBy(desc(posts.id))
         .limit(1)
         .execute();
       
       if (newestPostResult.length > 0) {
         await db.insert(ingestionCursor).values({
            id: cleanChannelUsername,
            last_message_id: newestPostResult[0].id,
            last_synced_at: new Date()
          }).onConflictDoUpdate({
            target: ingestionCursor.id,
            set: { last_message_id: newestPostResult[0].id, last_synced_at: new Date() }
          });
       }
    }

    console.log(`\n✅ Done! Inserted ${totalInserted} historical messages for @${cleanChannelUsername}.`);
  } catch (err) {
    console.error("Error during historical scrape:", err);
  } finally {
    await client.disconnect();
    process.exit(0);
  }
}

run();
