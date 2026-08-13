import Groq from "groq-sdk";
import { db } from "@/db";
import { posts, dailySummaries } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { ensureChannelScraped } from "./telegram/scraper";

const MODEL = "llama-3.3-70b-versatile";
/** Bumped when prompt/style changes so cached summaries regenerate. */
export const SUMMARY_LANGUAGE = "en-clean";

// Lazy-load the Groq client
let groqClient: Groq | null = null;
function getGroq(): Groq {
  if (!groqClient) {
    if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY is missing");
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
}

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

export async function summarizeDay(channel: string, localDate: string, targetLanguage: string = SUMMARY_LANGUAGE, forceRegenerate = false): Promise<string> {
  try {
    const summaryId = `${channel}:${localDate}`;

    // 1. Ensure we have the latest posts scraped on-demand
    await ensureChannelScraped(channel);

    // Check if summary exists (skip stale summaries from old prompt/language)
    if (!forceRegenerate) {
      const existing = await db.select().from(dailySummaries).where(eq(dailySummaries.id, summaryId)).execute();
      if (existing.length > 0 && existing[0].language === targetLanguage) {
        return existing[0].summary_text;
      }
    }

    // Get posts
    const dayPosts = await db.select().from(posts)
      .where(and(eq(posts.local_date, localDate), eq(posts.channel, channel)))
      .orderBy(asc(posts.date))
      .execute();
    
    if (dayPosts.length === 0) {
      return "No posts found for this date.";
    }

    const postsText = formatPostsForPrompt(dayPosts);
    
    // Determine the subject based on the channel
    const isBabi = channel.toLowerCase() === "dagmawi_babi";
    const subjectName = isBabi ? "Dagmawi Babi" : `@${channel}`;
    
    const systemPrompt = `You write short daily digests of Telegram channel posts for ${subjectName}.
You will receive one day's posts, separated by '---'.

Write a factual summary in plain English. Sound like a clear news brief or meeting notes — not marketing copy, not a personality voice.

Rules:
- Neutral tone. No jokes, slang, emojis, roleplay, or dramatic phrasing.
- English only.
- Cover the main topics and anything important the reader would miss if they skipped the channel.
- Group by topic, not chronological order.
- Do not invent details that are not in the posts.
- Mention photos/videos/links only when they matter to the story.
- No opening line ("Here is today's summary", etc.) — start with the content.
- Keep it short: 3–5 bullet points, or 2 compact paragraphs. About 80–100 words max.`;

    const completion = await getGroq().chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Here are the posts for ${localDate}:\n\n${postsText}` }
      ],
      model: MODEL,
      temperature: 0.2,
      max_tokens: 250,
    });

    const summary = completion.choices[0]?.message?.content || "Failed to generate summary.";
    
    // Is this date in the past?
    const todayStr = new Date().toISOString().split('T')[0];
    const isFinal = localDate < todayStr;

    await db.insert(dailySummaries).values({
      id: summaryId,
      channel: channel,
      local_date: localDate,
      summary_text: summary,
      post_count: dayPosts.length,
      language: targetLanguage,
      model_used: MODEL,
      is_final: isFinal,
      generated_at: new Date()
    }).onConflictDoUpdate({
      target: dailySummaries.id,
      set: { 
        summary_text: summary, 
        post_count: dayPosts.length,
        language: targetLanguage,
        is_final: isFinal,
        generated_at: new Date()
      }
    });

    return summary;
  } catch (err: any) {
    console.error("summarizeDay error:", err);
    return `Could not generate summary: ${err.message || "Unknown error"}. Please try again.`;
  }
}
