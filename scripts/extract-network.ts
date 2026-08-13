import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions";
import fs from "fs";

const apiId = parseInt(process.env.TELEGRAM_API_ID!);
const apiHash = process.env.TELEGRAM_API_HASH!;
const sessionString = process.env.TELEGRAM_USERBOT_SESSION!;

const targetChannel = process.argv[2] || "Dagmawi_Babi";
const messageLimit = parseInt(process.argv[3]) || 1000;

async function run() {
  console.log(`Analyzing the network of @${targetChannel}...`);
  console.log(`Fetching the last ${messageLimit} messages to find connected channels...`);

  const stringSession = new StringSession(sessionString);
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.connect();

  try {
    const messages = await client.getMessages(targetChannel, {
      limit: messageLimit,
    });

    const forwardedFrom = new Set<string>();
    const mentionedUsernames = new Set<string>();

    for (const msg of messages) {
      if (msg.className !== "Message") continue;

      // 1. Check for forwarded messages
      if (msg.fwdFrom) {
        if (msg.fwdFrom.fromId && msg.fwdFrom.fromId.className === "PeerChannel") {
          // We only have the channel ID from the forward.
          // Getting the username requires resolving the peer, which we can try later or just store the ID.
          // Let's store the ID and we will resolve it.
          const channelId = msg.fwdFrom.fromId.channelId.toString();
          forwardedFrom.add(channelId);
        }
      }

      // 2. Check for mentions in the text
      const text = msg.message;
      if (text) {
        const mentions = text.match(/@([a-zA-Z0-9_]+)/g);
        if (mentions) {
          for (const mention of mentions) {
            mentionedUsernames.add(mention.replace("@", ""));
          }
        }
        
        // Also check for t.me links
        const tmeLinks = text.match(/t\.me\/([a-zA-Z0-9_]+)/g);
        if (tmeLinks) {
          for (const link of tmeLinks) {
            mentionedUsernames.add(link.replace("t.me/", ""));
          }
        }
      }
    }

    console.log(`Found ${forwardedFrom.size} unique channels forwarded.`);
    console.log(`Found ${mentionedUsernames.size} unique @usernames mentioned.`);

    const network = {
      forwardedChannelIds: Array.from(forwardedFrom),
      mentionedUsernames: Array.from(mentionedUsernames)
    };

    fs.writeFileSync(`${targetChannel}_network.json`, JSON.stringify(network, null, 2));
    console.log(`\nSaved network data to ${targetChannel}_network.json`);

  } catch (err) {
    console.error("Error extracting network:", err);
  } finally {
    await client.disconnect();
    process.exit(0);
  }
}

run();
