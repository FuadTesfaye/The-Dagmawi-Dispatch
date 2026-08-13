import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

const apiId = parseInt(process.env.TELEGRAM_API_ID!);
const apiHash = process.env.TELEGRAM_API_HASH!;
const sessionString = process.env.TELEGRAM_USERBOT_SESSION!;
const botUsername = "BabisummarizeBot";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchBotReplies(client: TelegramClient, expectedCount: number, afterMessageId: number, timeoutMs: number = 20000) {
  const startTime = Date.now();
  let replies: any[] = [];
  while (Date.now() - startTime < timeoutMs) {
    const messages = await client.getMessages(botUsername, { limit: 10 });
    replies = messages.filter(m => !m.out && m.id > afterMessageId);
    if (replies.length >= expectedCount) break;
    await sleep(2000);
  }
  return replies;
}

async function run() {
  const stringSession = new StringSession(sessionString);
  const client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });
  await client.connect();

  console.log("✅ Connected. Testing sifendev channel on deployed bot...\n");

  const commands = [
    { cmd: "/channel @sifendev", expected: 1, wait: 8000 },
    { cmd: "/start", expected: 1, wait: 8000 },
    // First, use /today to fetch any posts. (Note: if it's late at night, they might have posted today, or we can use /yesterday)
    { cmd: "/yesterday", expected: 1, wait: 20000 },
    { cmd: "/roast", expected: 2, wait: 25000 }
  ];

  for (const step of commands) {
    console.log(`▶️ Sending: ${step.cmd}`);
    const sentMsg = await client.sendMessage(botUsername, { message: step.cmd });
    const replies = await fetchBotReplies(client, step.expected, sentMsg.id, step.wait);
    
    if (replies.length > 0) {
      for (const reply of replies.reverse()) {
        const textPreview = reply.message.length > 200 ? reply.message.substring(0, 200) + "..." : reply.message;
        console.log(`   🤖 Bot: ${textPreview.replace(/\n/g, " | ")}`);
      }
    } else {
       console.log(`   ⚠️ Timeout waiting for bot reply`);
    }
    await sleep(2000);
  }

  // Restore
  console.log("\n🧹 Restoring channel to @dagmawi_babi");
  await client.sendMessage(botUsername, { message: "/channel @dagmawi_babi" });

  await client.disconnect();
  console.log("\n✅ Test complete!");
  process.exit(0);
}

run().catch(console.error);
