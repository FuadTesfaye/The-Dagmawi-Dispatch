import "dotenv/config";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

const apiId = parseInt(process.env.TELEGRAM_API_ID!);
const apiHash = process.env.TELEGRAM_API_HASH!;
const sessionString = process.env.TELEGRAM_USERBOT_SESSION!;
const botUsername = "BabisummarizeBot"; // The deployed bot

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  const stringSession = new StringSession(sessionString);
  const client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });
  await client.connect();

  console.log("✅ Connected as Userbot. Starting E2E tests against production bot...\n");

  const commands = [
    "/start",
    "/roast",
    "/babiometer",
    "/guess 50",
    "some random gibberish", // Test fallback
    "/channel @news", // Test channel change
    "/channel", // Check channel
    "/channel @dagmawi_babi", // Revert back
  ];

  for (const cmd of commands) {
    console.log(`\n━━━ Sending: ${cmd} ━━━`);
    await client.sendMessage(botUsername, { message: cmd });
    
    // Wait for the bot to process and reply (Vercel edge function + Groq latency)
    // For AI commands, it might take 5-7 seconds. For basic ones, 1-2 seconds.
    // Let's just wait 4 seconds.
    await sleep(7000);

    // Fetch the latest messages from the chat with the bot
    const messages = await client.getMessages(botUsername, { limit: 3 });
    
    // Print the bot's response
    const botReply = messages.find(m => m.fromId?.className === "PeerUser" && m.message !== cmd);
    
    if (botReply) {
      console.log(`🤖 Bot replied:\n${botReply.message}\n`);
    } else {
      console.log(`⚠️ No reply received yet. (Might be still processing)`);
    }
    
    await sleep(2000); // breather between commands
  }

  await client.disconnect();
  console.log("✅ E2E Tests complete.");
  process.exit(0);
}

run().catch(console.error);
