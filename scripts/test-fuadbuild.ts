import "dotenv/config";
import { db } from "@/db";
import { userChannels } from "@/db/schema";
import { fetchNewMessages } from "@/lib/telegram/userbot";

async function run() {
  console.log("Setting fuadbuild as a tracked channel...");
  await db.insert(userChannels).values({
    telegram_user_id: "test_user_id",
    channel: "fuadbuild"
  }).onConflictDoUpdate({
    target: userChannels.telegram_user_id,
    set: { channel: "fuadbuild" }
  });

  console.log("Running ingestion...");
  const result = await fetchNewMessages();
  console.log("Ingestion complete!", result);
  process.exit(0);
}

run().catch(console.error);
