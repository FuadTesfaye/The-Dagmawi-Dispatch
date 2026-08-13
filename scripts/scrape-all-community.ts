import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions";
import fs from "fs";
import path from "path";

const apiId = parseInt(process.env.TELEGRAM_API_ID!);
const apiHash = process.env.TELEGRAM_API_HASH!;
const sessionString = process.env.TELEGRAM_USERBOT_SESSION!;

const networkFile = "Dagmawi_Babi_network.json";
const outputDir = path.join(process.cwd(), "data", "channels");
const CONCURRENCY = 4; // Scrape 4 channels at the same time

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function run() {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const networkData = JSON.parse(fs.readFileSync(networkFile, "utf-8"));
  const usernames = Array.from(new Set(
    networkData.mentionedUsernames.map((u: string) => u.toLowerCase())
  )).filter(u => u !== "gmail" && u !== "c");

  console.log(`Found ${usernames.length} unique usernames to scrape.`);

  const stringSession = new StringSession(sessionString);
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.connect();

  async function scrapeChannel(username: string) {
    console.log(`\nStarting scrape for @${username}...`);
    const outputFile = path.join(outputDir, `${username}.json`);
    
    if (fs.existsSync(outputFile)) {
       console.log(`@${username} already scraped, skipping...`);
       return;
    }
    
    let allMessages: any[] = [];
    let offsetId = 0;
    let hasMore = true;
    
    try {
      const entity = await client.getEntity(username);
      if (entity.className !== "Channel" && entity.className !== "User") {
         console.log(`@${username} is not a valid scrapeable entity. Skipping.`);
         return;
      }
    } catch (err: any) {
      console.log(`Could not resolve @${username}: ${err.message}`);
      return;
    }

    let consecutiveEmptyBatches = 0;

    while (hasMore) {
      try {
        const messages = await client.getMessages(username, {
          limit: 100,
          offsetId: offsetId
        });
        
        if (messages.length === 0) {
          consecutiveEmptyBatches++;
          if (consecutiveEmptyBatches > 1) {
            hasMore = false;
            break;
          }
        } else {
          consecutiveEmptyBatches = 0;
        }
        
        for (const msg of messages) {
           if (msg.className !== "Message") continue;
           
           allMessages.push({
             id: msg.id,
             date: new Date(msg.date * 1000).toISOString(),
             text: msg.message || "",
             views: msg.views || null,
             forwards: msg.forwards || null,
             replyToMsgId: msg.replyTo?.replyToMsgId || null,
             mediaType: msg.media ? msg.media.className : null,
             fwdFrom: msg.fwdFrom ? {
               channelId: msg.fwdFrom.fromId?.channelId?.toString() || null,
               userId: msg.fwdFrom.fromId?.userId?.toString() || null,
               date: msg.fwdFrom.date ? new Date(msg.fwdFrom.date * 1000).toISOString() : null
             } : null,
             rawJson: JSON.parse(JSON.stringify(msg))
           });
        }
        
        if (messages.length > 0) {
           offsetId = messages[messages.length - 1].id;
           if (allMessages.length % 500 === 0) {
             console.log(`@${username}: Fetched ${allMessages.length} messages... (going back to ID ${offsetId})`);
           }
        }
        
        // Very short sleep to avoid blocking completely, rely on Telegram/GramJS to throttle
        await sleep(200);
        
      } catch (err: any) {
        if (err.errorMessage && err.errorMessage.startsWith("FLOOD_WAIT_")) {
           const waitTime = parseInt(err.errorMessage.split("_")[2]);
           console.log(`@${username} Hit rate limit. Waiting for ${waitTime} seconds...`);
           await sleep((waitTime + 2) * 1000);
        } else {
           console.error(`Error scraping @${username}:`, err.message);
           hasMore = false;
        }
      }
    }
    
    if (allMessages.length > 0) {
      fs.writeFileSync(outputFile, JSON.stringify(allMessages, null, 2));
      console.log(`✅ Finished @${username}: Saved ${allMessages.length} messages`);
    } else {
      console.log(`⚠️ No messages found for @${username}`);
    }
  }

  try {
    // Process in chunks (CONCURRENCY)
    for (let i = 0; i < usernames.length; i += CONCURRENCY) {
      const chunk = usernames.slice(i, i + CONCURRENCY);
      console.log(`\nProcessing chunk: ${chunk.join(", ")}`);
      await Promise.all(chunk.map(u => scrapeChannel(u)));
    }
    console.log("\n🎉 Finished scraping all communities!");
  } catch (err) {
    console.error("Critical error in scrape script:", err);
  } finally {
    await client.disconnect();
    process.exit(0);
  }
}

run();
