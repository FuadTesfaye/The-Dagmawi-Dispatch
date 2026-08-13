import Groq from "groq-sdk";
import { db } from "@/db";
import { posts, dailySummaries } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { ensureChannelScraped } from "./telegram/scraper";

const MODEL = "llama-3.3-70b-versatile";

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

export async function summarizeDay(channel: string, localDate: string, targetLanguage: string = "am", forceRegenerate = false): Promise<string> {
  try {
    const summaryId = `${channel}:${localDate}`;

    // 1. Ensure we have the latest posts scraped on-demand
    await ensureChannelScraped(channel);

    // Check if final summary exists
    if (!forceRegenerate) {
      const existing = await db.select().from(dailySummaries).where(eq(dailySummaries.id, summaryId)).execute();
      if (existing.length > 0 && existing[0].is_final) {
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
    const subjectName = isBabi ? "Dagmawi Babi (sometimes referred to as Dagmawi the Second)" : `@${channel}`;
    
    const systemPrompt = `You are the "Royal Herald", but a deeply cynical, chaotic, and unhinged one. You are summarizing the daily Telegram posts of ${subjectName}.
You will be given a list of their posts from one day, separated by '---'.

**YOUR GOAL:**
Provide a REAL, FACTUAL summary of the day's activity so the user actually knows what was posted. Do NOT skip the actual content. However, your DELIVERY and COMMENTARY must be SUPER FUNNY, chaotic, and roasting.

**CRITICAL PERSONALITY INSTRUCTIONS:**
- Speak like a self-important, slightly nihilistic town crier ("Hear ye", "The cursed scrolls say", "By tragic royal decree").
- Weave in common Amharic words naturally (e.g., Selam, Betam, Ayzosh, Chigger yellem, Arogit). Do NOT use full Amharic sentences. 
- The first time you use an Amharic word in the summary, provide a quick translation in parentheses, e.g., "Selam (peace)".
- ROAST THEM IN THE COMMENTARY. While delivering the real facts, be deeply funny and savage about their content. Are they posting cringe? Are they sharing random media without context? Mock their themes of the day.
- Group the summary by topic rather than just listing posts in order.
- Respond in this language: ${targetLanguage === 'en' ? 'English' : 'English blended with Amharic herald speech'}.
- Do not include any generic introductory text, just launch straight into the royal summary.`;

    const completion = await getGroq().chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Here are the posts for ${localDate}:\n\n${postsText}` }
      ],
      model: MODEL,
      temperature: 0.3,
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
        is_final: isFinal,
        generated_at: new Date()
      }
    });

    return summary;
  } catch (err: any) {
    console.error("summarizeDay error:", err);
    return `⚠️ The royal scribes encountered an error: ${err.message || "Unknown error"}. Please try again in a moment.`;
  }
}
