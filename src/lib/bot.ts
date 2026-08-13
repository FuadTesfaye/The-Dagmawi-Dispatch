import { Bot } from "grammy";
import { db } from "@/db";
import { subscribers, posts, guesses } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { summarizeDay } from "@/lib/summarize";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error("TELEGRAM_BOT_TOKEN is missing");

export const bot = new Bot(token);

// ─── ROAST POOL ─────────────────────────────────────────────────
const ROASTS = [
  "Babi posted 37 times today. That's not a channel, that's a hostage situation for your notification bar.",
  "Dagmawi the Second has decreed 28 messages before noon. Even his phone is filing for workers' comp.",
  "I tried to summarize his posts but my AI asked for hazard pay. Ayzosh (take courage), we'll get through this.",
  "He posts so much, archaeologists in 3026 will assume he was an entire news agency, not one man with WiFi.",
  "Babi's posting frequency just broke the Geneva Convention. Somebody notify the UN.",
  "His thumbs have their own Wikipedia page under 'Weapons of Mass Communication.'",
  "If Babi stopped posting for 24 hours, Telegram's stock price would drop 12%. He IS the economy.",
  "Scientists have discovered a new unit of measurement: 1 Babi = 47 posts/day. It replaced the light-year for measuring distance between sanity and his channel.",
  "Legend says if you scroll to the top of his channel, you'll find a post that simply says 'testing 1 2 3.' That was yesterday.",
  "His keyboard doesn't have a backspace key. He doesn't make mistakes. He makes content.",
  "Babi doesn't sleep. He just switches to drafts.",
  "Breaking: Telegram is adding a new feature called 'Babi Mode' — it removes the character limit entirely.",
];

// ─── EXCUSE POOL ────────────────────────────────────────────────
const EXCUSES = [
  "Tell them: 'A wild hyena ate my phone before I could read the Dispatch. Betam (very) tragic.'",
  "Tell them: 'I was busy translating Dagmawi's latest 14-part audio message into interpretive dance.'",
  "Tell them: 'The royal scrolls were delayed by rain in Addis. And also by my laziness. Mostly the laziness.'",
  "Tell them: 'I read the summary but my memory got wiped by the sheer volume of his posts. Chigger yellem (no problem).'",
  "Tell them: 'I was on a spiritual retreat. From notifications.'",
  "Tell them: 'My phone died mid-scroll. It couldn't handle the weight of his wisdom.'",
  "Tell them: 'I DID read it. All of it. I just... blacked out from information overload. Ayzosh (take courage).'",
  "Tell them: 'I'm saving the posts for retirement. I'll have plenty of time then.'",
  "Tell them: 'Mercury was in retrograde and my Telegram stopped working. Science.'",
  "Tell them: 'I tried to open the channel but Babi had posted so much my phone needed a runway to scroll.'",
];

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

// Global error handler — ensures the webhook ALWAYS returns 200
bot.catch((err) => {
  console.error("Bot error (caught globally):", err);
});

// ─── /start ─────────────────────────────────────────────────────
bot.command("start", async (ctx) => {
  await ctx.reply(
    "📜 *Hear ye, hear ye!* Welcome to the *Dagmawi Dispatch*.\n\n" +
    "I am the Royal Herald — your shield against scroll fatigue.\n\n" +
    "*Royal Decrees:*\n" +
    "📖 /today — Today's scrolls (so far)\n" +
    "📖 /yesterday — Yesterday's final proclamation\n" +
    "📖 /date YYYY-MM-DD — Ancient history\n\n" +
    "*Royal Services:*\n" +
    "🕊️ /subscribe — Daily pigeon delivery\n" +
    "🎺 /babiometer — The royal noise gauge\n\n" +
    "*Royal Entertainment:*\n" +
    "🔥 /roast — Roast His Majesty\n" +
    "🛡️ /excuse — Didn't read the scrolls?\n" +
    "🎲 /guess N — Bet on today's post count",
    { parse_mode: "Markdown" }
  );
});

// ─── /subscribe ─────────────────────────────────────────────────
bot.command("subscribe", async (ctx) => {
  try {
    if (!ctx.from) return;
    const userId = String(ctx.from.id);
    const chatId = String(ctx.chat.id);
    
    await db.insert(subscribers)
      .values({ telegram_user_id: userId, chat_id: chatId, active: true })
      .onConflictDoUpdate({
        target: subscribers.telegram_user_id,
        set: { active: true, chat_id: chatId },
      });
      
    await ctx.reply(
      "🕊️ *The royal pigeon has been dispatched!*\n\n" +
      "Every morning, a freshly summarized scroll of Babi's daily output will arrive at your doorstep.\n\n" +
      "No more drowning in 40+ posts. No more FOMO. Just vibes and a clean summary.\n\n" +
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
      "You are now on your own in the wilderness of his channel. " +
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
    const localDateStr = getEATDateStr(0);
    
    await ctx.reply("🎺 Sounding the trumpets... reading today's scrolls...");
    const summary = await summarizeDay(localDateStr, "am", false);
    
    if (summary.includes("No posts found")) {
      await ctx.reply(
        `📜 *Today's Dispatch (${localDateStr}):*\n\n` +
        "The scrolls are quiet so far, townsfolk. His Majesty's thumbs appear to be resting.\n\n" +
        "_Check back later. Chigger yellem (no problem)._",
        { parse_mode: "Markdown" }
      );
    } else {
      await ctx.reply(`📜 *Today's Dispatch (${localDateStr}):*\n\n${summary}`, { parse_mode: "Markdown" });
    }
  } catch (err) {
    console.error("today error:", err);
    await ctx.reply("⚠️ The herald tripped over his scrolls. Please try /today again in a moment.");
  }
});

// ─── /yesterday ─────────────────────────────────────────────────
bot.command("yesterday", async (ctx) => {
  try {
    const localDateStr = getEATDateStr(-1);
    
    await ctx.reply("🐴 Riding to yesterday's vault...");
    const summary = await summarizeDay(localDateStr, "am", false);
    
    if (summary.includes("No posts found")) {
      await ctx.reply(
        `📜 *Yesterday's Dispatch (${localDateStr}):*\n\n` +
        "Silence from the throne. A rare blessing. The kingdom breathed.",
        { parse_mode: "Markdown" }
      );
    } else {
      await ctx.reply(`📜 *Yesterday's Dispatch (${localDateStr}):*\n\n${summary}`, { parse_mode: "Markdown" });
    }
  } catch (err) {
    console.error("yesterday error:", err);
    await ctx.reply("⚠️ The herald tripped over his scrolls. Please try /yesterday again.");
  }
});

// ─── /date ──────────────────────────────────────────────────────
bot.command("date", async (ctx) => {
  try {
    const dateStr = ctx.match;
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return ctx.reply("📅 Usage: `/date 2026-08-12`", { parse_mode: "Markdown" });
    }
    
    await ctx.reply(`🐴 Riding back to ${dateStr}...`);
    const summary = await summarizeDay(dateStr, "am", false);
    await ctx.reply(`📜 *Dispatch for ${dateStr}:*\n\n${summary}`, { parse_mode: "Markdown" });
  } catch (err) {
    console.error("date error:", err);
    await ctx.reply("⚠️ The herald tripped. Please try again.");
  }
});

// ─── /babiometer ────────────────────────────────────────────────
bot.command("babiometer", async (ctx) => {
  try {
    const localDateStr = getEATDateStr(0);
    
    const dayPosts = await db.select().from(posts).where(eq(posts.local_date, localDateStr)).execute();
    const count = dayPosts.length;
    
    let blasts: string;
    let verdict: string;
    let emoji: string;
    
    if (count === 0) {
      blasts = "🔇";
      verdict = "Total silence. Either Babi is sleeping, meditating, or his WiFi is down. All three are equally unlikely.";
      emoji = "💤";
    } else if (count <= 3) {
      blasts = "🎺";
      verdict = "A whisper from the throne. He's warming up. Or maybe this IS the warm-up and we should all run.";
      emoji = "😌";
    } else if (count <= 8) {
      blasts = "🎺🎺";
      verdict = "Moderate activity. A normal person's entire week of content. For Babi, this is a slow morning.";
      emoji = "📝";
    } else if (count <= 15) {
      blasts = "🎺🎺🎺";
      verdict = "The town criers are losing their voices. The scrolls are piling up. Notifications are crying for mercy.";
      emoji = "📢";
    } else if (count <= 25) {
      blasts = "🎺🎺🎺🎺";
      verdict = "CODE ORANGE. He's in his zone. Your 'mark as read' button is filing a restraining order.";
      emoji = "🔥";
    } else if (count <= 40) {
      blasts = "🎺🎺🎺🎺🎺";
      verdict = "DEFCON 2. Babi has entered hyperdrive. Telegram engineers are being woken up. Pray for your battery.";
      emoji = "🚨";
    } else {
      blasts = "🎺🎺🎺🎺🎺🎺 🚨🚨🚨";
      verdict = "DEFCON 1. HE'S COMPOSING A NOVEL. Abandon your phone. Touch grass. Save yourself. This is not a drill.";
      emoji = "☠️";
    }
    
    await ctx.reply(
      `${emoji} *THE BABI-O-METER* ${emoji}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `${blasts}\n\n` +
      `*Posts today:* ${count}\n` +
      `*Date:* ${localDateStr}\n\n` +
      `_${verdict}_`,
      { parse_mode: "Markdown" }
    );
  } catch (err) {
    console.error("babiometer error:", err);
    await ctx.reply("⚠️ The royal measuring device exploded. Try /babiometer again.");
  }
});

// ─── /roast ─────────────────────────────────────────────────────
bot.command("roast", async (ctx) => {
  try {
    const roast = ROASTS[Math.floor(Math.random() * ROASTS.length)];
    await ctx.reply(`🔥 *Royal Roast:*\n\n${roast}`, { parse_mode: "Markdown" });
  } catch (err) {
    await ctx.reply("🔥 Even the roast failed. That's how much Babi has broken the internet today.");
  }
});

// ─── /excuse ────────────────────────────────────────────────────
bot.command("excuse", async (ctx) => {
  try {
    const excuse = EXCUSES[Math.floor(Math.random() * EXCUSES.length)];
    await ctx.reply(
      `🛡️ *Your Royal Excuse:*\n\n${excuse}\n\n_Use responsibly. The Herald takes no legal responsibility._`,
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

    // No argument — show today's guesses and results
    if (!input) {
      const todayGuesses = await db.select().from(guesses)
        .where(eq(guesses.local_date, localDateStr)).execute();
      
      const dayPosts = await db.select().from(posts)
        .where(eq(posts.local_date, localDateStr)).execute();
      const actualCount = dayPosts.length;

      if (todayGuesses.length === 0) {
        await ctx.reply(
          "🎲 *The Royal Betting Pool*\n\n" +
          "No one has placed a bet yet today!\n\n" +
          `Current post count: *${actualCount}* (and counting...)\n\n` +
          "Place your bet: `/guess 25`\n" +
          "_How many posts will Babi make today?_",
          { parse_mode: "Markdown" }
        );
        return;
      }

      // Build the leaderboard
      const sorted = todayGuesses
        .map(g => ({ ...g, diff: Math.abs(g.guess - actualCount) }))
        .sort((a, b) => a.diff - b.diff);

      let board = sorted.map((g, i) => {
        const medal = i === 0 ? "👑" : i === 1 ? "🥈" : i === 2 ? "🥉" : "  ";
        return `${medal} ${g.display_name}: *${g.guess}* (off by ${g.diff})`;
      }).join("\n");

      await ctx.reply(
        `🎲 *The Royal Betting Pool — ${localDateStr}*\n\n` +
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
    const guessId = `${localDateStr}:${userId}`;
    await db.insert(guesses).values({
      id: guessId,
      local_date: localDateStr,
      telegram_user_id: userId,
      display_name: displayName,
      guess: guessNum,
    }).onConflictDoUpdate({
      target: guesses.id,
      set: { guess: guessNum, display_name: displayName },
    });

    const dayPosts = await db.select().from(posts)
      .where(eq(posts.local_date, localDateStr)).execute();

    const reactions = [
      `Bold move. ${guessNum} posts. The court awaits.`,
      `${guessNum}? Either you have inside information or you're delusional. Either way, respect.`,
      `A bet of ${guessNum}. The royal bookkeeper has noted it in ink that cannot be erased.`,
      `${guessNum} posts? That's ${guessNum > 30 ? "ambitious even for Babi" : guessNum < 5 ? "dangerously optimistic about his self-control" : "a reasonable wager"}.`,
    ];
    const reaction = reactions[Math.floor(Math.random() * reactions.length)];

    await ctx.reply(
      `🎲 *Bet Placed!*\n\n` +
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
