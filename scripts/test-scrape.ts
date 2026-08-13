import "dotenv/config";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

const apiId = parseInt(process.env.TELEGRAM_API_ID!);
const apiHash = process.env.TELEGRAM_API_HASH!;
const sessionString = process.env.TELEGRAM_USERBOT_SESSION!;
const channelUsername = "dagmawi_babi";

async function run() {
  const stringSession = new StringSession(sessionString);
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.connect();
  console.log("Connected.");
  
  try {
    const messages = await client.getMessages(channelUsername, {
      limit: 10,
    });
    console.log(`Fetched ${messages.length} messages.`);
    if (messages.length > 0) {
      console.log("First message:", messages[0].message);
    }
  } catch (e: any) {
    console.error("Error fetching messages:", e.message);
  }
  
  await client.disconnect();
  process.exit(0);
}

run();
