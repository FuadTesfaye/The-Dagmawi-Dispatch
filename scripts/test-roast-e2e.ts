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

  console.log("✅ Connected as Userbot. Testing ROAST on deployed bot...\n");

  const testChannels = ["selfmadecoder", "Fuadbuild", "dagmawi_babi"];

  for (const channel of testChannels) {
    // First, set the channel
    console.log(`\n━━━ Setting channel to @${channel} ━━━`);
    await client.sendMessage(botUsername, { message: `/channel @${channel}` });
    await sleep(4000);

    // Fetch response
    let messages = await client.getMessages(botUsername, { limit: 2 });
    const channelReply = messages[0];
    if (channelReply) {
      console.log(`🔧 Channel set: ${channelReply.message?.substring(0, 100)}...\n`);
    }

    // Now roast
    console.log(`━━━ Sending /roast for @${channel} ━━━`);
    await client.sendMessage(botUsername, { message: "/roast" });

    // Wait longer for AI roast (needs to query DB + Groq)
    await sleep(10000);

    // Fetch the bot's responses (the loading message + the actual roast)
    messages = await client.getMessages(botUsername, { limit: 4 });
    
    // Find the roast reply (look for the 🔥 Royal Roast message)
    for (const msg of messages) {
      if (msg.message?.includes("Royal Roast")) {
        console.log(`🔥 ROAST RESULT for @${channel}:\n${msg.message}\n`);
        break;
      }
    }

    await sleep(2000);
  }

  await client.disconnect();
  console.log("\n✅ Roast E2E test complete!");
  process.exit(0);
}

run().catch(console.error);
