import "dotenv/config";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

async function run() {
  await sql`
    CREATE TABLE IF NOT EXISTS guesses (
      id TEXT PRIMARY KEY,
      local_date DATE NOT NULL,
      telegram_user_id VARCHAR(100) NOT NULL,
      display_name VARCHAR(200) NOT NULL,
      guess INTEGER NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log("✅ guesses table created!");
  await sql.end();
  process.exit(0);
}

run().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
