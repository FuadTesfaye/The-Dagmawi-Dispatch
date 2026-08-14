import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";

const botUsername = "BabisummarizeBot";

const ERROR_PHRASES = [
  "something went wrong",
  "high demand right now",
  "could not generate",
  "we couldn't reach",
  "couldn't fetch",
  "temporarily unavailable",
  "royal bookkeeper spilled",
  "royal pigeon got lost",
  "scribes dropped",
  "measuring device exploded",
];

function looksLikeError(text: string): boolean {
  const lower = text.toLowerCase();
  return ERROR_PHRASES.some((p) => lower.includes(p));
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type StepResult = { cmd: string; ok: boolean; replies: string[]; error?: string };

async function fetchBotReplies(
  client: TelegramClient,
  expectedCount: number,
  afterMessageId: number,
  timeoutMs: number,
) {
  const startTime = Date.now();
  let replies: { id: number; message: string }[] = [];
  while (Date.now() - startTime < timeoutMs) {
    const messages = await client.getMessages(botUsername, { limit: 15 });
    replies = messages
      .filter((m) => !m.out && m.id > afterMessageId && m.message)
      .map((m) => ({ id: m.id, message: m.message! }));
    if (replies.length >= expectedCount) break;
    await sleep(2000);
  }
  return replies;
}

function preview(text: string, max = 180): string {
  const flat = text.replace(/\n/g, " | ");
  return flat.length > max ? flat.slice(0, max) + "..." : flat;
}

async function runCommand(
  client: TelegramClient,
  cmd: string,
  expected: number,
  wait: number,
): Promise<StepResult> {
  console.log(`\n▶️  ${cmd}`);
  try {
    const sentMsg = await client.sendMessage(botUsername, { message: cmd });
    const replies = await fetchBotReplies(client, expected, sentMsg.id, wait);
    const texts = replies.map((r) => r.message);

    for (const text of texts) {
      console.log(`   🤖 ${preview(text)}`);
    }

    const ok = texts.length >= expected && texts.every((t) => t.length > 0 && !looksLikeError(t));
    if (!ok) {
      const reason = texts.some(looksLikeError) ? "humanized error in reply" : `got ${texts.length}/${expected}`;
      console.log(`   ❌ Expected ${expected} ok reply(ies) — ${reason}`);
    } else {
      console.log(`   ✅ OK (${texts.length} reply)`);
    }

    return { cmd, ok, replies: texts, error: ok ? undefined : (texts.find(looksLikeError) ?? `got ${texts.length}/${expected}`) };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`   ❌ Error: ${msg}`);
    return { cmd, ok: false, replies: [], error: msg };
  }
}

async function run() {
  const apiId = parseInt(process.env.TELEGRAM_API_ID!);
  const apiHash = process.env.TELEGRAM_API_HASH!;
  const sessionString = process.env.TELEGRAM_USERBOT_SESSION!;

  const stringSession = new StringSession(sessionString);
  const client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });
  await client.connect();

  console.log("✅ Connected to deployed bot @" + botUsername);
  console.log("   Webhook: https://the-dagmawi-dispatch.vercel.app/api/telegram\n");

  const results: StepResult[] = [];

  // Channel switch (may include onboarding roast — allow 1 reply minimum)
  results.push(await runCommand(client, "/channel @selfmadecoder", 1, 30000));
  await sleep(2000);

  results.push(await runCommand(client, "/start", 1, 10000));
  await sleep(1500);
  results.push(await runCommand(client, "/today", 1, 45000));
  await sleep(3000);
  results.push(await runCommand(client, "/yesterday", 1, 45000));
  await sleep(3000);
  results.push(await runCommand(client, "/babiometer", 1, 15000));
  results.push(await runCommand(client, "/guess 50", 1, 10000));
  results.push(await runCommand(client, "/excuse", 1, 10000));
  // One-liner roast — single reply, no loading message
  results.push(await runCommand(client, "/roast", 1, 25000));
  results.push(await runCommand(client, "/channel", 1, 10000));
  results.push(await runCommand(client, "/subscribe", 1, 10000));
  results.push(await runCommand(client, "/unsubscribe", 1, 10000));

  // Restore default channel
  await runCommand(client, "/channel @dagmawi_babi", 1, 30000);

  await client.disconnect();

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);

  console.log("\n" + "=".repeat(50));
  console.log(`E2E results: ${passed}/${results.length} passed`);
  if (failed.length > 0) {
    console.log("Failed:");
    for (const f of failed) console.log(`  - ${f.cmd}: ${f.error}`);
    process.exit(1);
  }
  console.log("🎉 All deployed bot commands passed!");
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
