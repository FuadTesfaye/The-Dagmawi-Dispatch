import "dotenv/config";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

async function run() {
  // Fix posts PK
  try {
    await sql`ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_pkey`;
    await sql`ALTER TABLE posts ADD PRIMARY KEY (channel, id)`;
    console.log("✅ posts PK updated");
  } catch(e: any) { console.log("posts pk error", e.message); }

  console.log("\n🎉 PKs fixed!");
  await sql.end();
  process.exit(0);
}

run().catch(err => {
  console.error("Migration error:", err);
  process.exit(1);
});
