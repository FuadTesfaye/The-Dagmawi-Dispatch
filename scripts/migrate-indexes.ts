import postgres from "postgres";
import * as fs from "fs";

const envContent = fs.readFileSync(".env.local", "utf8");
const dbUrl = envContent.match(/DATABASE_URL="([^"]+)"/)?.[1]!;
const sql = postgres(dbUrl, { prepare: false, connect_timeout: 15 });

async function main() {
  console.log("Adding performance indexes...");

  await sql.unsafe(`
    CREATE INDEX IF NOT EXISTS idx_posts_channel_local_date
      ON posts (channel, local_date);

    CREATE INDEX IF NOT EXISTS idx_posts_channel_date
      ON posts (channel, date DESC);
  `);
  console.log("✅ posts indexes OK");

  const hasRoastHistory = await sql`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'roast_history'
    LIMIT 1
  `;
  if (hasRoastHistory.length > 0) {
    await sql.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_roast_history_channel_created
        ON roast_history (channel, created_at DESC);
    `);
    console.log("✅ roast_history index OK");
  } else {
    console.log("⏭️  roast_history table missing — skipped its index");
  }

  console.log("Done.");
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
