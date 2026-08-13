import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

const apiId = parseInt(process.env.TELEGRAM_API_ID!);
const apiHash = process.env.TELEGRAM_API_HASH!;
const sessionString = process.env.TELEGRAM_USERBOT_SESSION!;
const botUsername = "BabisummarizeBot";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  const stringSession = new StringSession(sessionString);
  const client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });
  await client.connect();

  console.log("✅ Connected. Setting channel to dagmawi_babi and sending /roast...\n");

  // Set channel
  await client.sendMessage(botUsername, { message: "/channel @dagmawi_babi" });
  await sleep(3000);

  // Send roast
  await client.sendMessage(botUsername, { message: "/roast" });
  
  // Wait generously for AI roast
  console.log("⏳ Waiting 15 seconds for AI roast to generate...");
  await sleep(15000);

  // Fetch last 5 messages
  const messages = await client.getMessages(botUsername, { limit: 5 });
  
  console.log("\n━━━ LAST 5 MESSAGES FROM BOT ━━━\n");
  for (const msg of messages.reverse()) {
    console.log(`[${msg.date ? new Date(msg.date * 1000).toISOString() : "?"}]`);
    console.log(msg.message);
    console.log("---\n");
  }

  await client.disconnect();
  process.exit(0);
}

run().catch(console.error);
