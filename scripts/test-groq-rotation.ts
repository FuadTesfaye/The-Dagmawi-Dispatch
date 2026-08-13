import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const MODEL = "llama-3.3-70b-versatile";

function maskKey(key: string): string {
  if (key.length <= 12) return "***";
  return `${key.slice(0, 8)}...${key.slice(-4)}`;
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`ASSERT FAILED: ${message}`);
}

async function minimalCompletion(
  createGroqCompletion: typeof import("../src/lib/groq-pool").createGroqCompletion,
  label: string,
) {
  return createGroqCompletion({
    messages: [
      { role: "system", content: "Reply with one word only." },
      { role: "user", content: label },
    ],
    model: MODEL,
    temperature: 0,
    max_tokens: 5,
  });
}

async function run() {
  const {
    loadGroqKeys,
    createGroqCompletion,
    groqPoolStats,
    groqKeyUsageStats,
    markKeyRateLimitedForTest,
    resetGroqPoolForTest,
  } = await import("../src/lib/groq-pool");

  resetGroqPoolForTest();
  const keys = loadGroqKeys();
  assert(keys.length >= 2, `Need at least 2 keys, found ${keys.length}`);

  console.log("=== Groq Key Rotation Test ===\n");
  console.log(`Keys loaded: ${keys.length}`);
  keys.forEach((k, i) => console.log(`  [${i}] ${maskKey(k)}`));
  console.log();

  // --- Test 1: Round-robin across all keys ---
  console.log("Test 1: Round-robin (one request per key, sequential)");
  resetGroqPoolForTest();

  for (let i = 0; i < keys.length; i++) {
    await minimalCompletion(createGroqCompletion, `ping-${i}`);
  }

  const usageAfterRoundRobin = groqKeyUsageStats();
  console.log("  Usage counts:", usageAfterRoundRobin);

  assert(
    usageAfterRoundRobin.every((c) => c === 1),
    `Expected each key used exactly once, got ${usageAfterRoundRobin.join(",")}`,
  );
  console.log("  PASS: Each key used exactly once in order\n");

  // --- Test 2: Parallel load spreads across keys ---
  console.log("Test 2: Parallel requests (10 concurrent)");
  resetGroqPoolForTest();

  await Promise.all(
    Array.from({ length: 10 }, (_, i) => minimalCompletion(createGroqCompletion, `parallel-${i}`)),
  );

  const usageParallel = groqKeyUsageStats();
  const totalParallel = usageParallel.reduce((a, b) => a + b, 0);
  const keysUsedParallel = usageParallel.filter((c) => c > 0).length;

  console.log("  Usage counts:", usageParallel);
  console.log(`  Total requests: ${totalParallel}, keys hit: ${keysUsedParallel}`);

  assert(totalParallel === 10, `Expected 10 total uses, got ${totalParallel}`);
  assert(keysUsedParallel >= 2, `Expected spread across multiple keys, only ${keysUsedParallel} used`);
  console.log("  PASS: Load distributed across multiple keys\n");

  // --- Test 3: Failover when keys are cooled down ---
  console.log("Test 3: Failover (cool down first 3 keys, request still succeeds)");
  resetGroqPoolForTest();

  const cooldownCount = Math.min(3, keys.length - 1);
  for (let i = 0; i < cooldownCount; i++) {
    markKeyRateLimitedForTest(i, 60_000);
  }

  const statsAfterCooldown = groqPoolStats();
  console.log(`  Cooled down ${cooldownCount} keys → healthy: ${statsAfterCooldown.healthyKeys}/${statsAfterCooldown.totalKeys}`);

  await minimalCompletion(createGroqCompletion, "failover-check");

  const usageFailover = groqKeyUsageStats();
  console.log("  Usage counts:", usageFailover);

  for (let i = 0; i < cooldownCount; i++) {
    assert(usageFailover[i] === 0, `Cooled key #${i} should not be used, got ${usageFailover[i]}`);
  }
  assert(
    usageFailover.slice(cooldownCount).some((c) => c > 0),
    "At least one healthy key should have been used",
  );
  console.log("  PASS: Request skipped cooled keys and used a healthy one\n");

  // --- Test 4: All keys cooled → error ---
  console.log("Test 4: All keys cooled down → expect error");
  resetGroqPoolForTest();

  for (let i = 0; i < keys.length; i++) {
    markKeyRateLimitedForTest(i, 60_000);
  }

  let allCooledError = false;
  try {
    await minimalCompletion(createGroqCompletion, "should-fail");
  } catch (err) {
    allCooledError = err instanceof Error && err.message.includes("rate-limited or unavailable");
    console.log(`  Got expected error: ${(err as Error).message}`);
  }

  assert(allCooledError, "Expected error when all keys are cooled down");
  console.log("  PASS: Correctly rejects when no keys available\n");

  console.log("=== All rotation tests passed ===");
}

run().catch((err) => {
  console.error("\nFAILED:", err);
  process.exit(1);
});
