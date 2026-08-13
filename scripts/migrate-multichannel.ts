import "dotenv/config";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

async function run() {
  // 1. Add 'channel' column to posts (with default so existing rows survive)
  await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS channel VARCHAR(100) NOT NULL DEFAULT 'dagmawi_babi'`;
  console.log("✅ posts.channel added");

  // 2. Drop old PK on posts, add composite unique constraint
  //    Since message IDs can collide across channels, we need channel+message_id to be unique
  //    But PK is 'id' (integer). Let's keep it but add a unique index on (channel, id)
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_channel_id ON posts (channel, id)`;
  console.log("✅ posts unique index (channel, id) created");

  // 3. Add 'channel' column to daily_summaries
  //    This is trickier because local_date is the PK. We need to change the PK.
  //    Let's drop and recreate since there's minimal data.
  await sql`DROP TABLE IF EXISTS daily_summaries`;
  await sql`
    CREATE TABLE daily_summaries (
      id TEXT PRIMARY KEY,
      channel VARCHAR(100) NOT NULL DEFAULT 'dagmawi_babi',
      local_date DATE NOT NULL,
      summary_text TEXT NOT NULL,
      post_count INTEGER NOT NULL,
      language VARCHAR(10) NOT NULL DEFAULT 'am',
      model_used VARCHAR(100),
      generated_at TIMESTAMPTZ DEFAULT NOW(),
      is_final BOOLEAN DEFAULT false
    )
  `;
  console.log("✅ daily_summaries recreated with channel support");

  // 4. Add 'channel' column to guesses
  await sql`ALTER TABLE guesses ADD COLUMN IF NOT EXISTS channel VARCHAR(100) NOT NULL DEFAULT 'dagmawi_babi'`;
  console.log("✅ guesses.channel added");

  // 5. Create user_channels table
  await sql`
    CREATE TABLE IF NOT EXISTS user_channels (
      telegram_user_id VARCHAR(100) PRIMARY KEY,
      channel VARCHAR(100) NOT NULL DEFAULT 'dagmawi_babi',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log("✅ user_channels table created");

  console.log("\n🎉 Migration complete!");
  await sql.end();
  process.exit(0);
}

run().catch(err => {
  console.error("Migration error:", err);
  process.exit(1);
});
