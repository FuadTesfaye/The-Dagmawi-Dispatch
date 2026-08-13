import "dotenv/config";
import { db } from "../src/db";
import { posts, dailySummaries } from "../src/db/schema";
import { eq, asc } from "drizzle-orm";
import { createGroqCompletion } from "../src/lib/groq-pool";

const MODEL = "llama-3.3-70b-versatile";

async function run() {
  // 1. Check today's EAT date and posts
  const now = new Date();
  const eat = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const todayStr = eat.toISOString().split('T')[0];
  const yesterdayEat = new Date(eat);
  yesterdayEat.setDate(yesterdayEat.getDate() - 1);
  const yesterdayStr = yesterdayEat.toISOString().split('T')[0];
  
  console.log(`Today (EAT): ${todayStr}`);
  console.log(`Yesterday (EAT): ${yesterdayStr}`);

  // 2. Check posts per date
  const allPosts = await db.select({ local_date: posts.local_date, id: posts.id }).from(posts).execute();
  const dateMap = new Map<string, number>();
  for (const p of allPosts) {
    const d = String(p.local_date);
    dateMap.set(d, (dateMap.get(d) || 0) + 1);
  }
  console.log("\nPosts per date:");
  for (const [d, count] of [...dateMap.entries()].sort()) {
    console.log(`  ${d}: ${count} posts`);
  }
  
  // 3. Test Groq with new model
  console.log("\n--- Testing Groq API with new model ---");
  const completion = await createGroqCompletion({
    messages: [
      { role: "system", content: "You are a helpful assistant. Respond in one sentence." },
      { role: "user", content: "Say hello." }
    ],
    model: MODEL,
    temperature: 0.3,
  });
  console.log("✅ Groq response:", completion.choices[0]?.message?.content);
  
  // 4. Test actual summarization for yesterday (since it has the most posts)
  const testDate = yesterdayStr;
  const dayPosts = await db.select().from(posts).where(eq(posts.local_date, testDate)).orderBy(asc(posts.date)).execute();
  console.log(`\n--- Summarizing ${testDate} (${dayPosts.length} posts) ---`);
  
  if (dayPosts.length === 0) {
    console.log("No posts for this date, skipping summarization test.");
  } else {
    const postsText = dayPosts.map(p => {
      let content = `[${p.date.toISOString()}] (ID: ${p.id})\n`;
      if (p.media_type !== 'none') content += `[Media: ${p.media_type}]\n`;
      if (p.text) content += `${p.text}\n`;
      return content;
    }).join("\n---\n");

    const systemPrompt = `You are the "Royal Herald" for a kingdom, summarizing the daily Telegram posts of "Dagmawi Babi".
Group by topic rather than just listing posts in order. Preserve named entities, numbers, and links exactly.
Speak like a self-important town crier. Weave in Amharic words naturally (Selam, Betam, Ayzosh, Chigger yellem) — first use gets a parenthetical translation.
Be slightly dramatic but affectionate. Do not include any generic intro, just the royal summary.`;

    const summaryCompletion = await createGroqCompletion({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Here are the posts for ${testDate}:\n\n${postsText}` }
      ],
      model: MODEL,
      temperature: 0.3,
    });

    const summary = summaryCompletion.choices[0]?.message?.content;
    console.log("\n✅ SUMMARY OUTPUT:");
    console.log("─".repeat(60));
    console.log(summary);
    console.log("─".repeat(60));
  }
  
  process.exit(0);
}

run().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
