import { Bot, Context } from "grammy";
import { writeDb, withReadDb } from "@/db";
import { subscribers, posts, guesses, userChannels } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { summarizeDay, SUMMARY_LANGUAGE } from "@/lib/summarize";
import { generateDailyRoast, generateOnboardingRoast, generateExcuse } from "@/lib/roasts";
import { ensureChannelScraped } from "@/lib/telegram/scraper";
import { checkRateLimit, retryAfterSeconds } from "@/lib/rate-limiter";
import { handlerPool } from "@/lib/concurrency-pool";
import { toHumanError, isErrorLikeContent } from "@/lib/human-errors";
import { TtlCache } from "@/lib/ttl-cache";

const userChannelCache = new TtlCache<string>();
const USER_CHANNEL_TTL_MS = 60_000;

async function replyError(ctx: { reply: (text: string) => Promise<unknown> }, err: unknown) {
  await ctx.reply(toHumanError(err, "command"));
}

async function withTyping<T>(ctx: { replyWithChatAction: (action: "typing") => Promise<unknown> }, fn: () => Promise<T>): Promise<T> {
  await ctx.replyWithChatAction("typing");
  return fn();
}

function formatSummaryReply(channel: string, date: string, summary: string): string {
  if (isErrorLikeContent(summary)) {
    return summary;
  }
  return `@${channel} — ${date}\n\n${summary}`;
}

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error("TELEGRAM_BOT_TOKEN is missing");

export const bot = new Bot(token);

bot.use(async (ctx, next) => {
  if (!ctx.from) return next();

  const text = ctx.message?.text || "";
  const command = text.startsWith("/")
    ? (text.split(/\s/)[0].slice(1).split("@")[0] || "default")
    : "default";
  const userId = String(ctx.from.id);

  if (!checkRateLimit(userId, command)) {
    const wait = retryAfterSeconds(userId, command);
    await ctx.reply(`High demand right now — please wait ${wait}s before trying again.`);
    return;
  }

  await handlerPool.run(() => next());
});

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
  const cached = userChannelCache.get(userId);
  if (cached) return cached;

  const result = await withReadDb((db) =>
    db.select().from(userChannels).where(eq(userChannels.telegram_user_id, userId)).execute()
  );
  const channel = result.length > 0 ? result[0].channel : "dagmawi_babi";
  userChannelCache.set(userId, channel, USER_CHANNEL_TTL_MS);
  return channel;
}

// Global error handler — ensures the webhook ALWAYS returns 200
bot.catch(async (err) => {
  const ctx = err.ctx;
  if (ctx) {
    try {
      await ctx.reply(toHumanError(err.error, "command"));
    } catch {
      // ignore reply failures
    }
  }
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
    `Welcome to *The Lurkening* — the only bot brave enough to read ALL of ${targetName} posts so you don't have to.\n\n` +
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
    `/channel — Select any Telegram channel to track\n` +
    `/subscribe — Auto-deliver the daily digest\n` +
    `/unsubscribe — Stop daily delivery\n` +
    `/lurkometer — How loud are they today? (alias: /babiometer)\n` +
    `/recommend — Popular channels others are tracking\n\n` +
    `🎭  *ENTERTAINMENT*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `/roast — Savage, unhinged roast of their posting habits\n` +
    `/excuse — Dark, unhinged excuses for dodging the spam\n` +
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

    await writeDb.insert(userChannels).values({
      telegram_user_id: userId,
      channel: cleanUsername,
    }).onConflictDoUpdate({
      target: userChannels.telegram_user_id,
      set: { channel: cleanUsername, updated_at: new Date() },
    });

    userChannelCache.set(userId, cleanUsername, USER_CHANNEL_TTL_MS);

    await ensureChannelScraped(cleanUsername, { force: true });

    let onboardingRoast = "";
    try {
      onboardingRoast = await generateOnboardingRoast(cleanUsername);
    } catch {
      // onboarding roast is optional
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
    await replyError(ctx, err);
  }
});

// ─── /subscribe ─────────────────────────────────────────────────
bot.command("subscribe", async (ctx) => {
  try {
    if (!ctx.from) return;
    const userId = String(ctx.from.id);
    const chatId = String(ctx.chat.id);
    const channel = await getUserChannel(userId);
    
    await writeDb.insert(subscribers)
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
    await replyError(ctx, err);
  }
});

// ─── /unsubscribe ───────────────────────────────────────────────
bot.command("unsubscribe", async (ctx) => {
  try {
    if (!ctx.from) return;
    const userId = String(ctx.from.id);
    
    await writeDb.update(subscribers)
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
    await replyError(ctx, err);
  }
});

// ─── /today ─────────────────────────────────────────────────────
bot.command("today", async (ctx) => {
  try {
    if (!ctx.from) return;
    const localDateStr = getEATDateStr(0);
    const channel = await getUserChannel(String(ctx.from.id));

    const summary = await withTyping(ctx, () =>
      summarizeDay(channel, localDateStr, SUMMARY_LANGUAGE, false),
    );

    if (summary.includes("No posts found")) {
      await ctx.reply(
        `@${channel} — ${localDateStr}\n\n` +
        "No posts yet for this date. Check back later."
      );
    } else {
      await ctx.reply(formatSummaryReply(channel, localDateStr, summary));
    }
  } catch (err) {
    await replyError(ctx, err);
  }
});

// ─── /yesterday ─────────────────────────────────────────────────
bot.command("yesterday", async (ctx) => {
  try {
    if (!ctx.from) return;
    const localDateStr = getEATDateStr(-1);
    const channel = await getUserChannel(String(ctx.from.id));

    const summary = await withTyping(ctx, () =>
      summarizeDay(channel, localDateStr, SUMMARY_LANGUAGE, false),
    );

    if (summary.includes("No posts found")) {
      await ctx.reply(
        `@${channel} — ${localDateStr}\n\n` +
        "No posts on this date."
      );
    } else {
      await ctx.reply(formatSummaryReply(channel, localDateStr, summary));
    }
  } catch (err) {
    await replyError(ctx, err);
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

    const summary = await withTyping(ctx, () =>
      summarizeDay(channel, dateStr, SUMMARY_LANGUAGE, false),
    );
    await ctx.reply(formatSummaryReply(channel, dateStr, summary));
  } catch (err) {
    await replyError(ctx, err);
  }
});

// ─── /lurkometer & /babiometer ──────────────────────────────────
const handleLurkometer = async (ctx: Context) => {
  try {
    if (!ctx.from) return;
    const localDateStr = getEATDateStr(0);
    const channel = await getUserChannel(String(ctx.from.id));

    await ensureChannelScraped(channel);

    const countRow = await withReadDb((db) =>
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(posts)
        .where(and(eq(posts.local_date, localDateStr), eq(posts.channel, channel)))
        .execute()
    );
    const count = countRow[0]?.count ?? 0;
    
    let blasts: string;
    let verdict: string;
    let emoji: string;

    const isBabi = channel.toLowerCase() === "dagmawi_babi";
    
    if (count === 0) {
      blasts = "🔇";
      verdict = isBabi
        ? "Eerie deafening silence. Either Babi's phone disintegrated, he is in witness protection, or he is charging up a 50-post storm for midnight."
        : "Suspicious calm. Zero posts today. Either the admin lost their phone or they are plotting digital warfare.";
      emoji = "💤";
    } else if (count <= 3) {
      blasts = "🎺";
      verdict = isBabi
        ? "A deceptive whisper from the throne. He is calibrating the chaos. Do not let your guard down."
        : "Micro-dosing content. Just enough to let you know they are alive and lurking.";
      emoji = "😌";
    } else if (count <= 8) {
      blasts = "🎺🎺";
      verdict = isBabi
        ? "A casual morning warm-up for Babi. For any normal human, this is an entire week of frantic oversharing."
        : "Moderate broadcast volume. The notifications are starting to gather at your doorstep.";
      emoji = "📝";
    } else if (count <= 15) {
      blasts = "🎺🎺🎺";
      verdict = isBabi
        ? "Babi has entered the chat. Keyboards are rattling, thumbs are blistering, productivity is plummeting."
        : "Elevated flurry. They are on a posting spree. Prepare your lock screen.";
      emoji = "⚡";
    } else if (count <= 25) {
      blasts = "🎺🎺🎺🎺";
      verdict = isBabi
        ? "CODE CRIMSON. He has entered the unmedicated zone. The 'mark as read' button has surrendered and fled the chat."
        : "Heavy deluge. Notifications are landing like artillery shells on your lock screen.";
      emoji = "🔥";
    } else if (count <= 40) {
      blasts = "🎺🎺🎺🎺🎺";
      verdict = isBabi
        ? "DEFCON 2. Lithium-ion homicide in progress. Phone battery is in digital hospice. Put your device in an ice bath."
        : "EXTREME VOLUME. Telegram engineers are receiving distress signals from your phone.";
      emoji = "🚨";
    } else {
      blasts = "🎺🎺🎺🎺🎺🎺 🚨🚨🚨";
      verdict = isBabi
        ? "DEFCON 1: APOCALYPTIC BROADCAST EVENT. He has dropped an entire encyclopedia. Abandon your phone. Touch grass. Save yourself."
        : "ABSOLUTE CHAOS. A full digital siege. Your notifications are taking catastrophic casualties.";
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
    await replyError(ctx, err);
  }
};

bot.command("lurkometer", handleLurkometer);
bot.command("babiometer", handleLurkometer);

// ─── /roast ─────────────────────────────────────────────────────
bot.command("roast", async (ctx) => {
  try {
    if (!ctx.from) return;
    const channel = await getUserChannel(String(ctx.from.id));

    const roast = await withTyping(ctx, () => generateDailyRoast(channel));
    await ctx.reply(`🔥 ${roast}`);
  } catch (err) {
    await replyError(ctx, err);
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
    await replyError(ctx, err);
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
      await ensureChannelScraped(channel);

      const todayGuesses = await withReadDb((db) =>
        db.select().from(guesses)
          .where(and(eq(guesses.local_date, localDateStr), eq(guesses.channel, channel))).execute()
      );
      
      const countRow = await withReadDb((db) =>
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(posts)
          .where(and(eq(posts.local_date, localDateStr), eq(posts.channel, channel)))
          .execute()
      );
      const actualCount = countRow[0]?.count ?? 0;

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
    await writeDb.insert(guesses).values({
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

    const dayPosts = await withReadDb((db) =>
      db.select().from(posts)
        .where(and(eq(posts.local_date, localDateStr), eq(posts.channel, channel))).execute()
    );

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
    await replyError(ctx, err);
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

    await ctx.replyWithChatAction("typing");

    const recs = await withReadDb((db) =>
      db.execute<{ channel: string; trackers: number }>(sql`
        SELECT channel, count(*)::int AS trackers
        FROM user_channels
        WHERE lower(channel) <> lower(${channel})
        GROUP BY channel
        ORDER BY trackers DESC, channel ASC
        LIMIT 3
      `),
    );

    if (recs.length === 0) {
      await ctx.reply(
        `🤷‍♂️ No other tracked channels in the kingdom yet. Try \`/channel @some_username\` and check back later!`,
        { parse_mode: "Markdown" },
      );
      return;
    }

    const lines = recs.map((r, i) => {
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉";
      const label = r.trackers === 1 ? "1 subject tracking" : `${r.trackers} subjects tracking`;
      return `${medal} *@${r.channel}* (${label})`;
    }).join("\n\n");

    await ctx.reply(
      `🎯 *Channel Recommendations*\n\n` +
      `Other channels tracked in the kingdom besides *@${channel}*:\n\n` +
      `${lines}\n\n` +
      `_Type \`/channel @username\` to start tracking one!_`,
      { parse_mode: "Markdown" },
    );
  } catch (err) {
    await replyError(ctx, err);
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
    `🎺 /lurkometer — Check the activity level\n` +
    `🎯 /recommend — See what others track\n\n` +
    `_Hit the / menu button to see all commands._`,
    { parse_mode: "Markdown" }
  );
});
