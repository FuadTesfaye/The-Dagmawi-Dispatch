import "dotenv/config";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;
const LOCAL_URL = "http://localhost:3002/api/telegram";

// Simulate a Telegram webhook update for a given command
async function simulateCommand(command: string, chatId = 123456789, userId = 123456789, firstName = "TestUser") {
  const update = {
    update_id: Math.floor(Math.random() * 1000000),
    message: {
      message_id: Math.floor(Math.random() * 1000000),
      from: {
        id: userId,
        is_bot: false,
        first_name: firstName,
      },
      chat: {
        id: chatId,
        type: "private",
      },
      date: Math.floor(Date.now() / 1000),
      text: command,
      entities: [{ offset: 0, length: command.split(" ")[0].length, type: "bot_command" }],
    },
  };

  console.log(`\n━━━ Testing: ${command} ━━━`);
  try {
    const res = await fetch(LOCAL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    });
    console.log(`Status: ${res.status}`);
    if (!res.ok) {
      const text = await res.text();
      console.log(`Response: ${text.substring(0, 500)}`);
    } else {
      console.log("✅ Webhook returned 200 (success)");
    }
  } catch (err: any) {
    console.error(`❌ Error: ${err.message}`);
  }
}

async function run() {
  // Wait for server to be ready
  console.log("Waiting 2s for server warmup...");
  await new Promise(r => setTimeout(r, 2000));

  // Test each command
  await simulateCommand("/roast");
  await simulateCommand("/excuse");
  await simulateCommand("/babiometer");
  await simulateCommand("/guess 25");
  await simulateCommand("/guess");
  await simulateCommand("/subscribe");
  // /today and /yesterday involve Groq calls, test last
  await simulateCommand("/today");

  console.log("\n━━━ ALL TESTS COMPLETE ━━━");
}

run().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
