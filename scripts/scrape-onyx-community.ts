import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import fs from "fs";
import path from "path";

const apiId = parseInt(process.env.TELEGRAM_API_ID!);
const apiHash = process.env.TELEGRAM_API_HASH!;
const sessionString = process.env.TELEGRAM_USERBOT_SESSION!;

const outputDir = path.join(process.cwd(), "data", "channels");
const CONCURRENCY = parseInt(process.env.SCRAPE_CONCURRENCY || "2"); // 2 concurrent channels by default

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface ScrapedMessage {
  id: number;
  date: string;
  text: string;
  views: number | null;
  forwards: number | null;
  replyToMsgId: number | null;
  mediaType: string | null;
  groupedId: string | null;
  fwdFrom: {
    channelId: string | null;
    userId: string | null;
    date: string | null;
    fromName: string | null;
    postAuthor: string | null;
  } | null;
  reactions: any | null;
  rawJson: any;
}

async function run() {
  if (!apiId || !apiHash || !sessionString) {
    console.error("❌ Missing Telegram credentials in .env.local!");
    process.exit(1);
  }

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Load target channel usernames from available JSON files inside data/channels/ first
  let usernames: string[] = [];

  const inChannelsCommunityFile = path.join(outputDir, "onyx_community_channels.json");
  const inChannelsUsernamesFile = path.join(outputDir, "onyx_usernames.json");
  const dataCommunityFile = path.join(process.cwd(), "data", "onyx_community_channels.json");
  const rootCommunityFile = path.join(process.cwd(), "onyx_community_channels.json");

  if (fs.existsSync(inChannelsUsernamesFile)) {
    usernames = JSON.parse(fs.readFileSync(inChannelsUsernamesFile, "utf-8"));
  } else if (fs.existsSync(inChannelsCommunityFile)) {
    const data = JSON.parse(fs.readFileSync(inChannelsCommunityFile, "utf-8"));
    usernames = data.map((item: any) => item.username || item);
  } else if (fs.existsSync(dataCommunityFile)) {
    const data = JSON.parse(fs.readFileSync(dataCommunityFile, "utf-8"));
    usernames = data.map((item: any) => item.username || item);
  } else if (fs.existsSync(rootCommunityFile)) {
    const data = JSON.parse(fs.readFileSync(rootCommunityFile, "utf-8"));
    usernames = data.map((item: any) => item.username || item);
  } else {
    // Fallback default list for Onyx design community if extraction hasn't been run yet
    usernames = ["OnyxDesignx", "Onyx2Community"];
    console.log("⚠️ No extracted channel list found. Defaulting to base community handles:", usernames);
  }

  // Remove duplicates and normalize
  usernames = Array.from(new Set(usernames.map(u => u.trim().toLowerCase()))).filter(Boolean);

  console.log(`🚀 Starting data scraper for ${usernames.length} community channels...`);
  console.log(`📁 Saving data to: ${outputDir}`);

  const stringSession = new StringSession(sessionString);
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.connect();

  async function scrapeChannel(username: string) {
    const outputFile = path.join(outputDir, `${username}.json`);
    
    // Check if channel already scraped
    let existingMessages: ScrapedMessage[] = [];
    if (fs.existsSync(outputFile)) {
      try {
        existingMessages = JSON.parse(fs.readFileSync(outputFile, "utf-8"));
        if (existingMessages.length > 0) {
          console.log(`⚡ @${username} already has ${existingMessages.length} messages saved. Checking for new ones...`);
        }
      } catch (e) {
        existingMessages = [];
      }
    }

    console.log(`📥 [Start] Scraping @${username}...`);

    let allMessages: ScrapedMessage[] = [...existingMessages];
    const existingMsgIds = new Set(allMessages.map(m => m.id));
    let offsetId = 0;
    let hasMore = true;
    let consecutiveEmptyBatches = 0;
    let fetchedInSession = 0;

    try {
      // Validate channel entity
      const entity = await client.getEntity(username);
      if (entity.className !== "Channel" && entity.className !== "User") {
        console.log(`⚠️ @${username} is not a scrapeable entity (${entity.className}). Skipping.`);
        return;
      }
    } catch (err: any) {
      console.log(`❌ Could not resolve @${username}: ${err.message}`);
      return;
    }

    while (hasMore) {
      try {
        const messages = await client.getMessages(username, {
          limit: 100,
          offsetId: offsetId,
        });

        if (messages.length === 0) {
          consecutiveEmptyBatches++;
          if (consecutiveEmptyBatches >= 2) {
            hasMore = false;
            break;
          }
        } else {
          consecutiveEmptyBatches = 0;
        }

        let newCount = 0;
        for (const msg of messages) {
          if (msg.className !== "Message") continue;
          
          if (!existingMsgIds.has(msg.id)) {
            existingMsgIds.add(msg.id);
            newCount++;
            fetchedInSession++;

            const scrapedMsg: ScrapedMessage = {
              id: msg.id,
              date: new Date(msg.date * 1000).toISOString(),
              text: msg.message || "",
              views: msg.views || null,
              forwards: msg.forwards || null,
              replyToMsgId: msg.replyTo?.replyToMsgId || null,
              mediaType: msg.media ? msg.media.className : null,
              groupedId: msg.groupedId ? msg.groupedId.toString() : null,
              fwdFrom: msg.fwdFrom ? {
                channelId: msg.fwdFrom.fromId?.channelId?.toString() || null,
                userId: msg.fwdFrom.fromId?.userId?.toString() || null,
                date: msg.fwdFrom.date ? new Date(msg.fwdFrom.date * 1000).toISOString() : null,
                fromName: msg.fwdFrom.fromName || null,
                postAuthor: msg.fwdFrom.postAuthor || null,
              } : null,
              reactions: msg.reactions ? JSON.parse(JSON.stringify(msg.reactions)) : null,
              rawJson: JSON.parse(JSON.stringify(msg)),
            };

            allMessages.push(scrapedMsg);
          }
        }

        if (messages.length > 0) {
          offsetId = messages[messages.length - 1].id;

          if (allMessages.length % 500 === 0 || newCount === 0) {
            console.log(`   @${username}: ${allMessages.length} total messages in memory (offsetId: ${offsetId})...`);
          }
        }

        // Slight rate-limiting delay between batches
        await sleep(300);

      } catch (err: any) {
        if (err.errorMessage && err.errorMessage.startsWith("FLOOD_WAIT_")) {
          const waitSeconds = parseInt(err.errorMessage.split("_")[2]) || 10;
          console.log(`⏳ @${username} hit rate limit. Sleeping for ${waitSeconds + 2} seconds...`);
          await sleep((waitSeconds + 2) * 1000);
        } else if (err.message && err.message.includes("CHAT_ADMIN_REQUIRED")) {
          console.log(`⚠️ @${username} requires admin permissions. Skipping.`);
          hasMore = false;
        } else {
          console.error(`❌ Error scraping @${username}: ${err.message}`);
          hasMore = false;
        }
      }
    }

    // Sort messages chronologically by ID
    allMessages.sort((a, b) => a.id - b.id);

    if (allMessages.length > 0) {
      try {
        // Use compact JSON stringification for memory efficiency on large channels
        const content = allMessages.length > 5000 
          ? JSON.stringify(allMessages) 
          : JSON.stringify(allMessages, null, 2);
        fs.writeFileSync(outputFile, content);
      } catch (err: any) {
        console.log(`⚠️ Unindented stringify fallback for @${username} due to size (${allMessages.length} msgs)...`);
        fs.writeFileSync(outputFile, JSON.stringify(allMessages));
      }
      console.log(`✅ [Done] @${username}: Saved ${allMessages.length} messages (${fetchedInSession} new) -> ${outputFile}`);
    } else {
      console.log(`⚠️ No messages retrieved for @${username}`);
    }
  }

  try {
    // Process channels in chunks based on CONCURRENCY
    for (let i = 0; i < usernames.length; i += CONCURRENCY) {
      const chunk = usernames.slice(i, i + CONCURRENCY);
      console.log(`\n🔄 Processing chunk ${Math.floor(i / CONCURRENCY) + 1}/${Math.ceil(usernames.length / CONCURRENCY)}: [${chunk.join(", ")}]`);
      await Promise.all(chunk.map(u => scrapeChannel(u)));
    }
    console.log("\n🎉 All channels in the community have been scraped successfully!");
  } catch (err) {
    console.error("Critical error in scraper:", err);
  } finally {
    await client.disconnect();
    process.exit(0);
  }
}

run();
