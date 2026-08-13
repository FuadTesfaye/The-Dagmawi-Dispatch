import "dotenv/config";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

async function run() {
  await sql`
    CREATE TABLE IF NOT EXISTS roast_history (
      id SERIAL PRIMARY KEY,
      channel VARCHAR(100) NOT NULL,
      line TEXT NOT NULL,
      kind VARCHAR(20) NOT NULL DEFAULT 'daily',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log("✅ roast_history table created");

  await sql`
    CREATE INDEX IF NOT EXISTS idx_roast_history_channel_created
    ON roast_history (channel, created_at DESC)
  `;
  console.log("✅ roast_history index created");

  console.log("\n🎉 Migration complete!");
  await sql.end();
  process.exit(0);
}

run().catch(err => {
  console.error("Migration error:", err);
  process.exit(1);
});
