import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const MODEL = "llama-3.3-70b-versatile";

async function run() {
  const {
    loadGroqKeys,
    createGroqCompletion,
    groqPoolStats,
    markKeyRateLimitedForTest,
  } = await import("../src/lib/groq-pool");

  const keys = loadGroqKeys();
  console.log("Loaded Groq keys:", keys.length);
  console.log("Pool stats (before):", groqPoolStats());

  if (keys.length === 0) {
    throw new Error("No Groq keys found in env");
  }

  const parallel = 10;
  const results = await Promise.all(
    Array.from({ length: parallel }, (_, i) =>
      createGroqCompletion({
        messages: [
          { role: "system", content: "Reply in one short sentence." },
          { role: "user", content: `Say hello #${i + 1}` },
        ],
        model: MODEL,
        temperature: 0.2,
        max_tokens: 30,
      })
    )
  );

  console.log(`✅ ${results.length} parallel completions succeeded`);
  console.log("Pool stats (after parallel):", groqPoolStats());

  markKeyRateLimitedForTest(0, 60_000);
  console.log("Pool stats (key 0 cooled down):", groqPoolStats());

  const fallback = await createGroqCompletion({
    messages: [
      { role: "system", content: "Reply in one short sentence." },
      { role: "user", content: "Confirm failover works." },
    ],
    model: MODEL,
    temperature: 0.2,
    max_tokens: 30,
  });

  console.log("✅ Failover completion:", fallback.choices[0]?.message?.content?.slice(0, 80));
  console.log("Pool stats (final):", groqPoolStats());
  console.log("\nAll Groq pool tests passed.");
}

run().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});
