import { Bot } from "grammy";
import { db } from "@/db";
import { subscribers, posts, guesses, userChannels } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { summarizeDay } from "@/lib/summarize";
import { generateDailyRoast, generateOnboardingRoast, generateExcuse } from "@/lib/roasts";
import { ensureChannelScraped } from "@/lib/telegram/scraper";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error("TELEGRAM_BOT_TOKEN is missing");

export const bot = new Bot(token);

// Helper: get date string in EAT (UTC+3)
function getEATDateStr(offsetDays = 0): string {
  const now = new Date();
  const eat = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  eat.setDate(eat.getDate() + offsetDays);
  return eat.toISOString().split('T')[0];
}

// Helper: get display name from context
function getDisplayName(ctx: any): string {
  if (!ctx.from) return "Anonymous Townsfolk";
  return ctx.from.first_name + (ctx.from.last_name ? ` ${ctx.from.last_name}` : "");
}

// Helper: get user's selected channel
async function getUserChannel(userId: string): Promise<string> {
  const result = await db.select().from(userChannels).where(eq(userChannels.telegram_user_id, userId)).execute();
  if (result.length > 0) return result[0].channel;
  return "dagmawi_babi"; // Default
}

// Global error handler — ensures the webhook ALWAYS returns 200
bot.catch((err) => {
  console.error("Bot error (caught globally):", err);
});

// ─── /start ─────────────────────────────────────────────────────
bot.command("start", async (ctx) => {
  const name = ctx.from?.first_name || "stranger";
  const userId = String(ctx.from?.id || "0");
  const channel = await getUserChannel(userId);
  const isBabi = channel.toLowerCase() === "dagmawi_babi";
  
  const targetName = isBabi ? "Babi's" : `@${channel}'s`;
  const footerName = isBabi ? "Babi's" : `@${channel}'s`;

  await ctx.reply(
    `📜 *Selam (peace), ${name}!*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Welcome to *The Dagmawi Dispatch* — the only bot brave enough to read ALL of ${targetName} posts so you don't have to.\n\n` +
    `We know you love them. We know you follow them. We also know you opened Telegram, saw 47 unread messages from one channel, and quietly closed the app.\n\n` +
    `*No judgment. That's why I exist.*\n\n` +
    `I scrape the channel, feed it to an AI, and hand you a clean summary every day. Your friendships are saved. Your FOMO is cured. Chigger yellem (no problem).\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📖  *THE SCROLLS*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `/today — What they said today (so far)\n` +
    `/yesterday — Yesterday's royal recap\n` +
    `/date — Dig up any date's archive\n\n` +
    `🕊️  *SERVICES*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `/channel — Select a different channel to track\n` +
    `/subscribe — Auto-deliver the daily digest\n` +
    `/unsubscribe — Leave the kingdom\n` +
    `/babiometer — How loud are they today?\n` +
    `/recommend — Hyper-personalized channel suggestions\n\n` +
    `🎭  *ENTERTAINMENT*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `/roast — Affectionately roast them\n` +
    `/excuse — Didn't read? We got you\n` +
    `/guess — Bet on their daily post count\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `_Powered by caffeine, Groq, and ${footerName} relentless output._`,
    { parse_mode: "Markdown" }
  );
});

// ─── /channel ───────────────────────────────────────────────────
bot.command("channel", async (ctx) => {
  try {
    if (!ctx.from) return;
    const userId = String(ctx.from.id);
    const input = ctx.match?.trim();

    if (!input) {
      const currentChannel = await getUserChannel(userId);
      await ctx.reply(
        `📡 *Royal Courier Service*\n\n` +
        `You are currently tracking: *@${currentChannel}*\n\n` +
        `To switch channels, type:\n\n` +
        `\`/channel @some_username\`\n\n` +
        `_The scribes will start fetching scrolls from the new channel automatically._`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    // Clean username
    const cleanUsername = input.replace(/^@/, "").replace(/[^a-zA-Z0-9_]/g, "");

    await db.insert(userChannels).values({
      telegram_user_id: userId,
      channel: cleanUsername,
    }).onConflictDoUpdate({
      target: userChannels.telegram_user_id,
      set: { channel: cleanUsername, updated_at: new Date() },
    });

    await ensureChannelScraped(cleanUsername);

    let onboardingRoast = "";
    try {
      onboardingRoast = await generateOnboardingRoast(cleanUsername);
    } catch (err) {
      console.error("onboarding roast error:", err);
    }

    const roastLine = onboardingRoast
      ? `\n\n🔥 _First impression:_ ${onboardingRoast}`
      : "";

    await ctx.reply(
      `✅ *Channel Updated!*\n\n` +
      `You are now tracking *@${cleanUsername}*.${roastLine}\n\n` +
      `_Note: Our scribes fetch scrolls every few hours. If this is a new channel, it may take a little while for the archives to populate._`,
      { parse_mode: "Markdown" }
    );
  } catch (err) {
    console.error("channel error:", err);
    await ctx.reply("⚠️ The scribes dropped the ink. Try `/channel @username` again.", { parse_mode: "Markdown" });
  }
});

// ─── /subscribe ─────────────────────────────────────────────────
bot.command("subscribe", async (ctx) => {
  try {
    if (!ctx.from) return;
    const userId = String(ctx.from.id);
    const chatId = String(ctx.chat.id);
    const channel = await getUserChannel(userId);
    
    await db.insert(subscribers)
      .values({ telegram_user_id: userId, chat_id: chatId, active: true })
      .onConflictDoUpdate({
        target: subscribers.telegram_user_id,
        set: { active: true, chat_id: chatId },
      });
      
    await ctx.reply(
      "🕊️ *The royal pigeon has been dispatched!*\n\n" +
      `Every morning, a freshly summarized scroll of @${channel}'s daily output will arrive at your doorstep.\n\n` +
      "No more drowning in posts. No more FOMO. Just vibes and a clean summary.\n\n" +
      "_Selam (peace) be with you, loyal subject._",
      { parse_mode: "Markdown" }
    );
  } catch (err) {
    console.error("subscribe error:", err);
    await ctx.reply("⚠️ The royal pigeon got lost in a sandstorm. Please try /subscribe again.");
  }
});

// ─── /unsubscribe ───────────────────────────────────────────────
bot.command("unsubscribe", async (ctx) => {
  try {
    if (!ctx.from) return;
    const userId = String(ctx.from.id);
    
    await db.update(subscribers)
      .set({ active: false })
      .where(eq(subscribers.telegram_user_id, userId));
      
    await ctx.reply(
      "❌ *You have been banished from the pigeon route.*\n\n" +
      "The royal pigeon will no longer visit your dwelling. " +
      "You are now on your own in the wilderness. " +
      "Ayzosh (take courage). You will need it.",
      { parse_mode: "Markdown" }
    );
  } catch (err) {
    console.error("unsubscribe error:", err);
    await ctx.reply("⚠️ Something went wrong. Please try /unsubscribe again.");
  }
});

// ─── /today ─────────────────────────────────────────────────────
bot.command("today", async (ctx) => {
  try {
    if (!ctx.from) return;
    const localDateStr = getEATDateStr(0);
    const channel = await getUserChannel(String(ctx.from.id));
    
    await ctx.reply(`🎺 Sounding the trumpets... reading today's scrolls from @${channel}...`);
    const summary = await summarizeDay(channel, localDateStr, "am", false);
    
    if (summary.includes("No posts found")) {
      await ctx.reply(
        `📜 Today's Dispatch for @${channel} (${localDateStr}):\n\n` +
        "The scrolls are quiet so far, townsfolk. Thumbs appear to be resting.\n\n" +
        "Check back later. Chigger yellem (no problem)."
      );
    } else {
      await ctx.reply(`📜 Today's Dispatch for @${channel} (${localDateStr}):\n\n${summary}`);
    }
  } catch (err) {
    console.error("today error:", err);
    await ctx.reply("⚠️ The herald tripped over his scrolls. Please try /today again in a moment.");
  }
});

// ─── /yesterday ─────────────────────────────────────────────────
bot.command("yesterday", async (ctx) => {
  try {
    if (!ctx.from) return;
    const localDateStr = getEATDateStr(-1);
    const channel = await getUserChannel(String(ctx.from.id));
    
    await ctx.reply(`🐴 Riding to yesterday's vault for @${channel}...`);
    const summary = await summarizeDay(channel, localDateStr, "am", false);
    
    if (summary.includes("No posts found")) {
      await ctx.reply(
        `📜 Yesterday's Dispatch for @${channel} (${localDateStr}):\n\n` +
        "Silence from the throne. A rare blessing. The kingdom breathed."
      );
    } else {
      await ctx.reply(`📜 Yesterday's Dispatch for @${channel} (${localDateStr}):\n\n${summary}`);
    }
  } catch (err) {
    console.error("yesterday error:", err);
    await ctx.reply("⚠️ The herald tripped over his scrolls. Please try /yesterday again.");
  }
});

// ─── /date ──────────────────────────────────────────────────────
bot.command("date", async (ctx) => {
  try {
    if (!ctx.from) return;
    const channel = await getUserChannel(String(ctx.from.id));
    const dateStr = ctx.match;
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return ctx.reply("📅 Usage: /date 2026-08-12");
    }
    
    await ctx.reply(`🐴 Riding back to ${dateStr} for @${channel}...`);
    const summary = await summarizeDay(channel, dateStr, "am", false);
    await ctx.reply(`📜 Dispatch for @${channel} on ${dateStr}:\n\n${summary}`);
  } catch (err) {
    console.error("date error:", err);
    await ctx.reply("⚠️ The herald tripped. Please try again.");
  }
});

// ─── /babiometer ────────────────────────────────────────────────
bot.command("babiometer", async (ctx) => {
  try {
    if (!ctx.from) return;
    const localDateStr = getEATDateStr(0);
    const channel = await getUserChannel(String(ctx.from.id));
    
    // Ensure we have fresh posts
    const { ensureChannelScraped } = await import("@/lib/telegram/scraper");
    await ensureChannelScraped(channel);
    
    const dayPosts = await db.select().from(posts)
      .where(and(eq(posts.local_date, localDateStr), eq(posts.channel, channel)))
      .execute();
    const count = dayPosts.length;
    
    let blasts: string;
    let verdict: string;
    let emoji: string;

    const isBabi = channel.toLowerCase() === "dagmawi_babi";
    
    if (count === 0) {
      blasts = "🔇";
      verdict = isBabi ? "Total silence. Either Babi is sleeping, meditating, or his WiFi is down. All three are equally unlikely." : "Total silence. A peaceful day in the kingdom.";
      emoji = "💤";
    } else if (count <= 3) {
      blasts = "🎺";
      verdict = isBabi ? "A whisper from the throne. He's warming up." : "Low activity. Just a few decrees.";
      emoji = "😌";
    } else if (count <= 8) {
      blasts = "🎺🎺";
      verdict = isBabi ? "Moderate activity. A normal person's entire week of content. For Babi, this is a slow morning." : "Moderate activity. The channel is alive.";
      emoji = "📝";
    } else if (count <= 15) {
      blasts = "🎺🎺🎺";
      verdict = isBabi ? "The town criers are losing their voices. The scrolls are piling up. Notifications are crying for mercy." : "High activity. The scribe's hand is cramping.";
      emoji = "📢";
    } else if (count <= 25) {
      blasts = "🎺🎺🎺🎺";
      verdict = isBabi ? "CODE ORANGE. He's in his zone. Your 'mark as read' button is filing a restraining order." : "Heavy deluge. Notifications incoming.";
      emoji = "🔥";
    } else if (count <= 40) {
      blasts = "🎺🎺🎺🎺🎺";
      verdict = isBabi ? "DEFCON 2. Babi has entered hyperdrive. Telegram engineers are being woken up. Pray for your battery." : "EXTREME VOLUME. Take cover.";
      emoji = "🚨";
    } else {
      blasts = "🎺🎺🎺🎺🎺🎺 🚨🚨🚨";
      verdict = isBabi ? "DEFCON 1. HE'S COMPOSING A NOVEL. Abandon your phone. Touch grass. Save yourself. This is not a drill." : "Absolute chaos. A novel has been written.";
      emoji = "☠️";
    }
    
    const title = isBabi ? "*THE BABI-O-METER*" : `*THE @${channel.toUpperCase()} METER*`;

    await ctx.reply(
      `${emoji} ${title} ${emoji}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `${blasts}\n\n` +
      `*Posts today:* ${count}\n` +
      `*Date:* ${localDateStr}\n\n` +
      `_${verdict}_`,
      { parse_mode: "Markdown" }
    );
  } catch (err) {
    console.error("babiometer error:", err);
    await ctx.reply("⚠️ The royal measuring device exploded. Try again.");
  }
});

// ─── /roast ─────────────────────────────────────────────────────
bot.command("roast", async (ctx) => {
  try {
    if (!ctx.from) return;
    const channel = await getUserChannel(String(ctx.from.id));

    const roast = await generateDailyRoast(channel);
    await ctx.reply(`🔥 ${roast}`);
  } catch (err) {
    console.error("roast error:", err);
    await ctx.reply("🔥 Even the roast failed. That's how much the internet broke today.");
  }
});

// ─── /excuse ────────────────────────────────────────────────────
bot.command("excuse", async (ctx) => {
  try {
    if (!ctx.from) return;
    const channel = await getUserChannel(String(ctx.from.id));
    const excuse = generateExcuse(channel);
    await ctx.reply(
      `🛡️ *Your Royal Excuse for missing @${channel}'s posts:*\n\n${excuse}\n\n_Use responsibly. The Herald takes no legal responsibility._`,
      { parse_mode: "Markdown" }
    );
  } catch (err) {
    await ctx.reply("🛡️ Even the excuse generator broke. Just tell them you were busy. Chigger yellem.");
  }
});

// ─── /guess ─────────────────────────────────────────────────────
bot.command("guess", async (ctx) => {
  try {
    if (!ctx.from) return;
    const input = ctx.match?.trim();
    const localDateStr = getEATDateStr(0);
    const userId = String(ctx.from.id);
    const displayName = getDisplayName(ctx);
    const channel = await getUserChannel(userId);

    // No argument — show today's guesses and results
    if (!input) {
      const { ensureChannelScraped } = await import("@/lib/telegram/scraper");
      await ensureChannelScraped(channel);

      const todayGuesses = await db.select().from(guesses)
        .where(and(eq(guesses.local_date, localDateStr), eq(guesses.channel, channel))).execute();
      
      const dayPosts = await db.select().from(posts)
        .where(and(eq(posts.local_date, localDateStr), eq(posts.channel, channel))).execute();
      const actualCount = dayPosts.length;

      if (todayGuesses.length === 0) {
        await ctx.reply(
          `🎲 *The Betting Pool for @${channel}*\n\n` +
          "No one has placed a bet yet today!\n\n" +
          `Current post count: *${actualCount}* (and counting...)\n\n` +
          "Place your bet: `/guess 25`\n" +
          `_How many posts will @${channel} make today?_`,
          { parse_mode: "Markdown" }
        );
        return;
      }

      // Build the leaderboard
      const sorted = todayGuesses
        .map(g => ({ ...g, diff: Math.abs(g.guess - actualCount) }))
        .sort((a, b) => a.diff - b.diff);

      const board = sorted.map((g, i) => {
        const medal = i === 0 ? "👑" : i === 1 ? "🥈" : i === 2 ? "🥉" : "  ";
        return `${medal} ${g.display_name}: *${g.guess}* (off by ${g.diff})`;
      }).join("\n");

      await ctx.reply(
        `🎲 *The Betting Pool for @${channel} — ${localDateStr}*\n\n` +
        `📊 Actual post count so far: *${actualCount}*\n\n` +
        `${board}\n\n` +
        `_${sorted[0].diff === 0 ? `${sorted[0].display_name} nailed it! Betam (very) impressive!` : `${sorted[0].display_name} is closest! The day isn't over yet...`}_`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    // Parse the guess number
    const guessNum = parseInt(input, 10);
    if (isNaN(guessNum) || guessNum < 0 || guessNum > 200) {
      await ctx.reply("🎲 Please enter a reasonable number: `/guess 25`\n_Range: 0–200_", { parse_mode: "Markdown" });
      return;
    }

    // Save the guess (upsert)
    const guessId = `${channel}:${localDateStr}:${userId}`;
    await db.insert(guesses).values({
      id: guessId,
      channel: channel,
      local_date: localDateStr,
      telegram_user_id: userId,
      display_name: displayName,
      guess: guessNum,
    }).onConflictDoUpdate({
      target: guesses.id,
      set: { guess: guessNum, display_name: displayName },
    });

    const dayPosts = await db.select().from(posts)
      .where(and(eq(posts.local_date, localDateStr), eq(posts.channel, channel))).execute();

    const reactions = [
      `Bold move. ${guessNum} posts. The court awaits.`,
      `${guessNum}? Either you have inside information or you're delusional. Either way, respect.`,
      `A bet of ${guessNum}. The royal bookkeeper has noted it in ink that cannot be erased.`,
      `${guessNum} posts? That's ${guessNum > 30 ? "ambitious" : guessNum < 5 ? "dangerously optimistic" : "a reasonable wager"}.`,
    ];
    const reaction = reactions[Math.floor(Math.random() * reactions.length)];

    await ctx.reply(
      `🎲 *Bet Placed for @${channel}!*\n\n` +
      `${displayName} bets *${guessNum}* posts today.\n` +
      `_${reaction}_\n\n` +
      `📊 Current count: *${dayPosts.length}* (and counting...)\n\n` +
      `Use /guess with no number to see the leaderboard.`,
      { parse_mode: "Markdown" }
    );
  } catch (err) {
    console.error("guess error:", err);
    await ctx.reply("⚠️ The royal bookkeeper spilled ink. Try `/guess 25` again.", { parse_mode: "Markdown" });
  }
});

// ─── /streak ────────────────────────────────────────────────────
bot.command("streak", async (ctx) => {
  await ctx.reply(
    "🔥 *Royal Streak:*\n\n" +
    "The bookkeeper is currently on a pilgrimage to Mount Entoto. " +
    "Streak tracking will be available upon his return.\n\n" +
    "_In the meantime, we assume your dedication is legendary._",
    { parse_mode: "Markdown" }
  );
});

// ─── /recommend ───────────────────────────────────────────────────
bot.command("recommend", async (ctx) => {
  try {
    if (!ctx.from) return;
    const channel = await getUserChannel(String(ctx.from.id));
    
    await ctx.reply(`🔍 Consulting the Royal Archives to find channels similar to @${channel}...`);
    
    const { searchDb } = await import("@/db");
    const { sql } = await import("drizzle-orm");
    
    // Query the graph to find out who this channel mentions the most!
    const query = sql`
      SELECT target_username, sum(weight) as total_weight
      FROM channel_edges 
      WHERE source_id IN (SELECT id FROM channels WHERE lower(username) = lower(${channel}))
      GROUP BY target_username
      ORDER BY total_weight DESC
      LIMIT 3
    `;
    
    const result = await searchDb.execute(query);
    
    if (result.length === 0) {
      await ctx.reply(`🤷‍♂️ The scribes couldn't find any connections for @${channel} yet. Try again later!`);
      return;
    }
    
    const recs = result.map((r: any, i: number) => {
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉";
      return `${medal} *@${r.target_username}* (Mentioned ${r.total_weight} times)`;
    }).join("\n\n");
    
    await ctx.reply(
      `🎯 *Hyper-Personalized Recommendations*\n\n` +
      `Because you follow *@${channel}*, you might also enjoy these channels in the same community:\n\n` +
      `${recs}\n\n` +
      `_Type \`/channel @username\` to start tracking one of these!_`,
      { parse_mode: "Markdown" }
    );
  } catch (err) {
    console.error("recommend error:", err);
    await ctx.reply("⚠️ The recommendation engine overheated. Try again later.");
  }
});

// ─── FALLBACK HANDLER ───────────────────────────────────────────
bot.on("message", async (ctx) => {
  // If the user sent a valid command that wasn't matched above,
  // or if they just typed random text, we gently mock them and show the menu.
  
  const text = ctx.message.text || "";
  
  let opening = "The herald squints at your message. He has no idea what you are trying to say.";
  
  if (text.startsWith("/")) {
    opening = `The herald squints at your scrolls. "${text}" is not a known royal decree.`;
  }
  
  await ctx.reply(
    `🤨 *Confusion in the Court*\n\n` +
    `${opening}\n\n` +
    `Please speak in a language the royal scribes understand:\n\n` +
    `📖 /today — Today's summary\n` +
    `🐴 /yesterday — Yesterday's summary\n` +
    `🎲 /guess — Bet on the post count\n` +
    `📡 /channel — Switch the channel you track\n` +
    `🎺 /babiometer — Check the chaos level\n` +
    `🎯 /recommend — Hyper-personalized suggestions\n\n` +
    `_Hit the / menu button to see all commands._`,
    { parse_mode: "Markdown" }
  );
});
