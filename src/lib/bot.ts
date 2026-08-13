import { Bot, webhookCallback } from "grammy";
import { db } from "@/db";
import { subscribers, dailySummaries } from "@/db/schema";
import { eq } from "drizzle-orm";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error("TELEGRAM_BOT_TOKEN is missing");

export const bot = new Bot(token);

bot.command("start", async (ctx) => {
  await ctx.reply(
    "👋 Welcome to the **Dagmawi Dispatch** bot!\n\n" +
    "I summarize Dagmawi Babi's channel every day.\n" +
    "Commands:\n" +
    "/today - Get today's summary (so far)\n" +
    "/yesterday - Get yesterday's final summary\n" +
    "/date YYYY-MM-DD - Get summary for a specific date\n" +
    "/subscribe - Get daily pushes automatically\n" +
    "/unsubscribe - Stop daily pushes",
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
    
  await ctx.reply("✅ You are now subscribed! I will send you the daily summary every morning.");
});

bot.command("unsubscribe", async (ctx) => {
  if (!ctx.from) return;
  const userId = String(ctx.from.id);
  
  await db.update(subscribers)
    .set({ active: false })
    .where(eq(subscribers.telegram_user_id, userId));
    
  await ctx.reply("❌ You have been unsubscribed.");
});

import { summarizeDay } from "@/lib/summarize";

bot.command("today", async (ctx) => {
  const date = new Date();
  const localDateOffset = 3 * 60 * 60 * 1000; // EAT timezone
  const eatDate = new Date(date.getTime() + localDateOffset);
  const localDateStr = eatDate.toISOString().split('T')[0];
  
  await ctx.reply("Fetching today's summary... this might take a few seconds.");
  const summary = await summarizeDay(localDateStr, "am", false);
  await ctx.reply(`📅 **Today's Summary (${localDateStr}):**\n\n${summary}`, { parse_mode: "Markdown" });
});

bot.command("yesterday", async (ctx) => {
  const date = new Date();
  const localDateOffset = 3 * 60 * 60 * 1000; 
  const eatDate = new Date(date.getTime() + localDateOffset);
  eatDate.setDate(eatDate.getDate() - 1);
  const localDateStr = eatDate.toISOString().split('T')[0];
  
  await ctx.reply("Fetching yesterday's summary...");
  const summary = await summarizeDay(localDateStr, "am", false);
  await ctx.reply(`📅 **Yesterday's Summary (${localDateStr}):**\n\n${summary}`, { parse_mode: "Markdown" });
});

bot.command("date", async (ctx) => {
  const dateStr = ctx.match;
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return ctx.reply("Please provide a date in YYYY-MM-DD format, e.g., `/date 2026-08-12`", { parse_mode: "Markdown" });
  }
  
  await ctx.reply(`Fetching summary for ${dateStr}...`);
  const summary = await summarizeDay(dateStr, "am", false);
  await ctx.reply(`📅 **Summary for ${dateStr}:**\n\n${summary}`, { parse_mode: "Markdown" });
});
