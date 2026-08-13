import { Bot, webhookCallback } from "grammy";
import { db } from "@/db";
import { subscribers, dailySummaries, posts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { summarizeDay } from "@/lib/summarize";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error("TELEGRAM_BOT_TOKEN is missing");

export const bot = new Bot(token);

const ROASTS = [
  "Babi is typing... and typing... and typing. We might need a second internet just for his thumbs.",
  "Dagmawi the Second has issued 42 decrees today. The kingdom is tired, Babi. Betam tired.",
  "I tried to summarize his posts, but my AI circuits overheated. Ayzosh (take courage), we will survive this.",
  "He posts so much, even the Telegram servers are asking for a day off. Chigger yellem (no problem), I'll keep reading them for you."
];

const EXCUSES = [
  "Tell them: 'A wild hyena ate my phone before I could read the Dispatch.'",
  "Tell them: 'I was busy translating Dagmawi's latest 14-part audio message.'",
  "Tell them: 'The royal scrolls were delayed by rain in Addis.'",
  "Tell them: 'I tried to read it, but my eyes glazed over. Selam (peace) be with you instead.'"
];

bot.command("start", async (ctx) => {
  await ctx.reply(
    "📜 **Hear ye, hear ye!** Welcome to the **Dagmawi Dispatch**.\n\n" +
    "I am the Royal Herald. I bring you Babi's news, minus the scroll fatigue.\n\n" +
    "**The Decrees (Commands):**\n" +
    "/today - Read today's scrolls (so far)\n" +
    "/yesterday - Yesterday's final royal proclamation\n" +
    "/date YYYY-MM-DD - Dig up ancient history\n" +
    "/subscribe - Receive the daily pigeon automatically\n" +
    "/babiometer - Check the royal noise level\n" +
    "/roast - A gentle jab at his majesty\n" +
    "/excuse - For when you didn't read the scrolls\n" +
    "/guess - Petition to guess today's post count",
    { parse_mode: "Markdown" }
  );
});

bot.command("subscribe", async (ctx) => {
  if (!ctx.from) return;
  const userId = String(ctx.from.id);
  const chatId = String(ctx.chat.id);
  
  await db.insert(subscribers)
    .values({ telegram_user_id: userId, chat_id: chatId, active: true })
    .onConflictDoUpdate({
      target: subscribers.telegram_user_id,
      set: { active: true, chat_id: chatId },
    });
    
  await ctx.reply("🕊️ **It is done!** The royal pigeon will deliver the digest to you every morning. Selam (peace) be with you.");
});

bot.command("unsubscribe", async (ctx) => {
  if (!ctx.from) return;
  const userId = String(ctx.from.id);
  
  await db.update(subscribers)
    .set({ active: false })
    .where(eq(subscribers.telegram_user_id, userId));
    
  await ctx.reply("❌ **You have been banished from the pigeon route.** No more digests for you. Ayzosh (take courage) on your own!");
});

bot.command("today", async (ctx) => {
  const date = new Date();
  const localDateOffset = 3 * 60 * 60 * 1000; // EAT timezone
  const eatDate = new Date(date.getTime() + localDateOffset);
  const localDateStr = eatDate.toISOString().split('T')[0];
  
  await ctx.reply("🎺 Sounding the trumpets... reading today's scrolls... wait a moment.");
  const summary = await summarizeDay(localDateStr, "am", false);
  
  // If the summary is the empty fallback
  if (summary.includes("No posts found")) {
    await ctx.reply(`📜 **Today's Dispatch (${localDateStr}):**\n\nThe scrolls are quiet so far, townsfolk. Check back later. Chigger yellem (no problem).`, { parse_mode: "Markdown" });
  } else {
    await ctx.reply(`📜 **Today's Dispatch (${localDateStr}):**\n\n${summary}`, { parse_mode: "Markdown" });
  }
});

bot.command("yesterday", async (ctx) => {
  const date = new Date();
  const localDateOffset = 3 * 60 * 60 * 1000; 
  const eatDate = new Date(date.getTime() + localDateOffset);
  eatDate.setDate(eatDate.getDate() - 1);
  const localDateStr = eatDate.toISOString().split('T')[0];
  
  await ctx.reply("🐴 Fetching yesterday's archives from the royal vault...");
  const summary = await summarizeDay(localDateStr, "am", false);
  
  if (summary.includes("No posts found")) {
    await ctx.reply(`📜 **Yesterday's Dispatch (${localDateStr}):**\n\nSilence from the throne. A rare blessing.`, { parse_mode: "Markdown" });
  } else {
    await ctx.reply(`📜 **Yesterday's Dispatch (${localDateStr}):**\n\n${summary}`, { parse_mode: "Markdown" });
  }
});

bot.command("date", async (ctx) => {
  const dateStr = ctx.match;
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return ctx.reply("Please provide a date in YYYY-MM-DD format, e.g., `/date 2026-08-12`", { parse_mode: "Markdown" });
  }
  
  await ctx.reply(`🐴 Riding back to ${dateStr}...`);
  const summary = await summarizeDay(dateStr, "am", false);
  await ctx.reply(`📜 **Dispatch for ${dateStr}:**\n\n${summary}`, { parse_mode: "Markdown" });
});

bot.command("babiometer", async (ctx) => {
  const date = new Date();
  const localDateOffset = 3 * 60 * 60 * 1000; 
  const eatDate = new Date(date.getTime() + localDateOffset);
  const localDateStr = eatDate.toISOString().split('T')[0];
  
  const dayPosts = await db.select().from(posts).where(eq(posts.local_date, localDateStr)).execute();
  const count = dayPosts.length;
  
  let blasts = "🎺";
  let message = "A quiet day. The kingdom rests.";
  
  if (count > 5 && count <= 10) { blasts = "🎺🎺"; message = "He is stirring. Some decrees have been made."; }
  if (count > 10 && count <= 20) { blasts = "🎺🎺🎺"; message = "The town criers are losing their voices."; }
  if (count > 20 && count <= 40) { blasts = "🎺🎺🎺🎺"; message = "Sound the alarms! A deluge of information is upon us!"; }
  if (count > 40) { blasts = "🎺🎺🎺🎺🎺 🚨"; message = "MAYDAY! He's composing a novel. Abandon all hope of keeping up."; }
  
  await ctx.reply(`**The Babi-o-meter for today:**\n\n${blasts}\n*${count} posts today.*\n\n${message}`, { parse_mode: "Markdown" });
});

bot.command("roast", async (ctx) => {
  const roast = ROASTS[Math.floor(Math.random() * ROASTS.length)];
  await ctx.reply(`🔥 **Royal Roast:**\n\n${roast}`, { parse_mode: "Markdown" });
});

bot.command("excuse", async (ctx) => {
  const excuse = EXCUSES[Math.floor(Math.random() * EXCUSES.length)];
  await ctx.reply(`🛡️ **Your Ready-Made Excuse:**\n\n${excuse}`, { parse_mode: "Markdown" });
});

bot.command("guess", async (ctx) => {
  await ctx.reply("🎲 **The Royal Betting Pool** is currently under construction by the court engineers. Soon, you will be able to petition your guesses for his daily post count!", { parse_mode: "Markdown" });
});

bot.command("streak", async (ctx) => {
  await ctx.reply("🔥 **Royal Streak:** The bookkeeper is asleep, but we assume your dedication is legendary. Check back when the vault is fully built!", { parse_mode: "Markdown" });
});
