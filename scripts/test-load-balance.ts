import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function run() {
  const { readDb, writeDb, dbPoolStats, withReadDb } = await import("../src/db");
  const { handlerPool, aiPool } = await import("../src/lib/concurrency-pool");
  const { posts } = await import("../src/db/schema");
  const { sql } = await import("drizzle-orm");

  console.log("DB pool config:", dbPoolStats());
  console.log("Write DB reachable:", !!writeDb);

  const readStart = Date.now();
  const readResults = await Promise.all(
    Array.from({ length: 100 }, () =>
      withReadDb((db) => db.select({ id: posts.id }).from(posts).limit(1).execute())
    )
  );
  console.log(`✅ 100 concurrent readDb queries: ${readResults.length} ok in ${Date.now() - readStart}ms`);

  const pingStart = Date.now();
  await Promise.all(
    Array.from({ length: 20 }, (_, i) =>
      withReadDb((db) => db.execute(sql`SELECT ${i}::int AS n`))
    )
  );
  console.log(`✅ 20 concurrent SELECT pings in ${Date.now() - pingStart}ms`);

  let peak = 0;
  let current = 0;
  const handlerStart = Date.now();
  await Promise.all(
    Array.from({ length: 100 }, () =>
      handlerPool.run(async () => {
        current++;
        peak = Math.max(peak, current);
        await new Promise((r) => setTimeout(r, 5));
        current--;
      })
    )
  );
  console.log(
    `✅ 100 handler pool tasks: peak concurrent=${peak}, cap=${handlerPool.stats.max}, ${Date.now() - handlerStart}ms`
  );

  const aiStart = Date.now();
  await Promise.all(
    Array.from({ length: 50 }, () =>
      aiPool.run(async () => {
        await new Promise((r) => setTimeout(r, 2));
      })
    )
  );
  console.log(`✅ 50 ai pool tasks: ${Date.now() - aiStart}ms`, aiPool.stats);

  if (peak > handlerPool.stats.max) {
    throw new Error(`Handler pool exceeded cap: ${peak} > ${handlerPool.stats.max}`);
  }

  console.log("\nAll load-balance tests passed.");
}

run().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
