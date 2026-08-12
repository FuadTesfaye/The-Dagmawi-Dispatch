const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const input = require("input");
require("dotenv").config({ path: ".env.local" });

const apiId = parseInt(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH;
const stringSession = new StringSession(""); // Empty string means new session

(async () => {
  console.log("Starting userbot login process...");
  
  if (!apiId || !apiHash) {
    console.error("Missing TELEGRAM_API_ID or TELEGRAM_API_HASH in .env.local");
    process.exit(1);
  }

  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: async () => await input.text("Please enter your phone number (e.g. +1234567890): "),
    password: async () => await input.text("Please enter your 2FA password (if any): "),
    phoneCode: async () => await input.text("Please enter the code you received on Telegram: "),
    onError: (err) => console.log(err),
  });

  console.log("You should now be connected!");
  
  const savedSession = client.session.save();
  console.log("\n--- COPY THE STRING BELOW AND ADD IT TO YOUR .env.local ---");
  console.log(`TELEGRAM_USERBOT_SESSION="${savedSession}"`);
  console.log("-----------------------------------------------------------\n");

  // Verify we can read something, e.g. getting your own info
  const me = await client.getMe();
  console.log("Logged in as:", me.username || me.firstName);

  await client.disconnect();
})();
