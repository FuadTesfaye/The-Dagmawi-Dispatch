import Groq from "groq-sdk";
import { db } from "@/db";
import { posts, dailySummaries } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Format the posts into a text blob
function formatPostsForPrompt(dayPosts: any[]) {
  return dayPosts.map(p => {
    let content = `[${p.date.toISOString()}] (ID: ${p.id})\n`;
    if (p.media_type !== 'none') {
      content += `[Media: ${p.media_type}]\n`;
    }
    if (p.text) {
      content += `${p.text}\n`;
    }
    return content;
  }).join("\n---\n");
}

export async function summarizeDay(localDate: string, targetLanguage: string = "am", forceRegenerate = false) {
  // Check if final summary exists
  if (!forceRegenerate) {
    const existing = await db.select().from(dailySummaries).where(eq(dailySummaries.local_date, localDate)).execute();
    if (existing.length > 0 && existing[0].is_final) {
      return existing[0].summary_text;
    }
  }

  // Get posts
  const dayPosts = await db.select().from(posts).where(eq(posts.local_date, localDate)).orderBy(asc(posts.date)).execute();
  
  if (dayPosts.length === 0) {
    return "No posts found for this date.";
  }

  const postsText = formatPostsForPrompt(dayPosts);
  
  const systemPrompt = `You are a helpful assistant that summarizes a Telegram channel's daily activity.
You will be given a list of posts from one day, separated by '---'. 
Each post has a timestamp and optional media indicators.
Your job is to summarize the day's activity. Group by topic rather than just listing posts in order.
Preserve named entities, numbers, and links exactly. Note media-only posts briefly ("shared a photo of...").
Respond in this language: ${targetLanguage === 'en' ? 'English' : 'Amharic (Ethiopian)'}.
Do not include any generic introductory text, just the summary.`;

  const completion = await groq.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Here are the posts for ${localDate}:\n\n${postsText}` }
    ],
    model: "llama3-70b-8192", // Using a capable model
    temperature: 0.3,
  });

  const summary = completion.choices[0]?.message?.content || "Failed to generate summary.";
  
  // Is this date in the past?
  const todayStr = new Date().toISOString().split('T')[0];
  const isFinal = localDate < todayStr;

  await db.insert(dailySummaries).values({
    local_date: localDate,
    summary_text: summary,
    post_count: dayPosts.length,
    language: targetLanguage,
    model_used: "llama3-70b-8192",
    is_final: isFinal,
    generated_at: new Date()
  }).onConflictDoUpdate({
    target: dailySummaries.local_date,
    set: { 
      summary_text: summary, 
      post_count: dayPosts.length,
      is_final: isFinal,
      generated_at: new Date()
    }
  });

  return summary;
}
