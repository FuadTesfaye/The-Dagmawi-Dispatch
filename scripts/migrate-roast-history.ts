import * as fs from "fs";

const envContent = fs.readFileSync(".env.local", "utf8");
for (const line of envContent.split("\n")) {
  const m = line.match(/^([A-Z_0-9]+)="?([^"#]*)"?\s*$/);
  if (m && m[1] && m[2]) process.env[m[1]] = m[2].trim();
}

import postgres from "postgres";

async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");

  const sql = postgres(url, { prepare: false, connect_timeout: 15 });

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

run().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
