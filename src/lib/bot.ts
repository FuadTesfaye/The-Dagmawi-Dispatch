import { Bot, Context, InlineKeyboard } from "grammy";
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

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error("TELEGRAM_BOT_TOKEN is missing");

export const bot = new Bot(token);

// ─── RATE LIMITING & CONCURRENCY ─────────────────────────────────
bot.use(async (ctx, next) => {
  if (!ctx.from) return next();

  const text = ctx.message?.text || "";
  const command = text.startsWith("/")
    ? (text.split(/\s/)[0].slice(1).split("@")[0] || "default")
    : ctx.callbackQuery ? "callback" : "default";
  const userId = String(ctx.from.id);

  if (!checkRateLimit(userId, command)) {
    const wait = retryAfterSeconds(userId, command);
    if (ctx.callbackQuery) {
      await ctx.answerCallbackQuery({ text: `⏳ Please wait ${wait}s (Rate limit)`, show_alert: true });
      return;
    }
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

// Helper: check subscription
async function isUserSubscribed(userId: string): Promise<boolean> {
  const result = await withReadDb((db) =>
    db.select().from(subscribers).where(and(eq(subscribers.telegram_user_id, userId), eq(subscribers.active, true))).execute()
  );
  return result.length > 0;
}

async function replyError(ctx: { reply: (text: string, options?: any) => Promise<unknown> }, err: unknown) {
  await ctx.reply(toHumanError(err, "command"), { parse_mode: "Markdown" });
}

async function withTyping<T>(ctx: { replyWithChatAction: (action: "typing") => Promise<unknown> }, fn: () => Promise<T>): Promise<T> {
  await ctx.replyWithChatAction("typing");
  return fn();
}

function formatSummaryReply(channel: string, date: string, summary: string): string {
  if (isErrorLikeContent(summary)) {
    return summary;
  }
  return `📰 *@${channel.toUpperCase()} DISPATCH* · ${date}\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n${summary}`;
}

// ─── BROADSHEET INLINE KEYBOARD BUILDERS ─────────────────────────

function buildMainMenuKeyboard(channel: string, isSubscribed: boolean) {
  return new InlineKeyboard()
    .text("📖 Today's Digest", "menu_today")
    .text("📜 Yesterday", "menu_yesterday")
    .row()
    .text("📊 Lurk-O-Meter", "menu_lurkometer")
    .text("🔥 Channel Roast", "menu_roast")
    .row()
    .text("🛡️ Royal Excuse", "menu_excuse")
    .text("🎲 Betting Pool", "menu_guess")
    .row()
    .text(`📡 Channel: @${channel}`, "menu_channels")
    .text(isSubscribed ? "🔔 Subscribed [✓]" : "🔕 Subscribe", "menu_subscribe_toggle")
    .row()
    .url("🌐 Open Broadsheet Gazette", "https://t.me/lurkening_bot");
}

function buildChannelPickerKeyboard(currentChannel: string) {
  const popular = ["dagmawi_babi", "tikvahethiopia", "fuad_dispatches", "ethio_tech"];
  const kb = new InlineKeyboard();

  popular.forEach((ch, idx) => {
    const isCur = ch.toLowerCase() === currentChannel.toLowerCase();
    kb.text(`${isCur ? "▶ " : ""}@${ch}`, `set_channel:${ch}`);
    if (idx % 2 === 1) kb.row();
  });

  if (popular.length % 2 !== 0) kb.row();

  return kb
    .text("🎯 Channel Recommendations", "menu_recommend")
    .row()
    .text("« Return to Menu", "menu_main");
}

function buildGuessKeyboard(currentCount: number) {
  return new InlineKeyboard()
    .text("🎲 5 Posts", "make_guess:5")
    .text("🎲 12 Posts", "make_guess:12")
    .text("🎲 20 Posts", "make_guess:20")
    .row()
    .text("🎲 35 Posts", "make_guess:35")
    .text("🎲 50+ Posts", "make_guess:50")
    .row()
    .text("🏆 View Leaderboard", "menu_guess_board")
    .row()
    .text("« Return to Menu", "menu_main");
}

function buildDigestKeyboard(channel: string) {
  return new InlineKeyboard()
    .text("🔄 Re-Summarize", "menu_today")
    .text("🔥 Roast This Channel", "menu_roast")
    .row()
    .text("📊 Lurkometer", "menu_lurkometer")
    .text("« Menu", "menu_main");
}

// Global error handler
bot.catch(async (err) => {
  const ctx = err.ctx;
  if (ctx) {
    try {
      await ctx.reply(toHumanError(err.error, "command"));
    } catch {}
  }
});

// ─── /start & Web Auth Handshake ─────────────────────────────────
bot.command("start", async (ctx) => {
  const name = ctx.from?.first_name || "Citizen Scribe";
  const userId = String(ctx.from?.id || "0");
  const payload = ctx.match?.trim();

  // 1. Check if user came from a web login handshake (start=lurk_xxxx)
  if (payload && payload.startsWith("lurk_")) {
    await ctx.replyWithChatAction("typing");
    await ctx.reply(
      `👑 *ROYAL SCRIBE AUTHENTICATED!*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Welcome, *${name}*! Your Telegram identity has been confirmed for the Broadsheet Gazette.\n\n` +
      `Your browser session has been authorized. You can now return to the web dispatch to stamp reactions, request AI briefs, and browse the archives.`,
      {
        parse_mode: "Markdown",
        reply_markup: new InlineKeyboard()
          .url("🌐 Return to Broadsheet Gazette", "https://t.me/lurkening_bot")
          .row()
          .text("🎛️ Open Bot Dashboard", "menu_main"),
      }
    );
    return;
  }

  const channel = await getUserChannel(userId);
  const subscribed = await isUserSubscribed(userId);

  await ctx.reply(
    `📜 *✦ THE LURKENING · ROYAL GAZETTE & TELEPRINTER ✦*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Greetings, *${name}*!\n\n` +
    `The kingdom's AI dispatch engine monitors Telegram channels, delivers on-demand executive summaries, satyrical roasts, and real-time activity metrics.\n\n` +
    `📡 *Active Channel:* *@${channel}*\n` +
    `🕊️ *Pigeon Delivery:* ${subscribed ? "Active (Every Morning)" : "Disabled"}\n\n` +
    `Select a royal decree below:`,
    {
      parse_mode: "Markdown",
      reply_markup: buildMainMenuKeyboard(channel, subscribed),
    }
  );
});

// ─── /menu ───────────────────────────────────────────────────────
bot.command("menu", async (ctx) => {
  if (!ctx.from) return;
  const userId = String(ctx.from.id);
  const channel = await getUserChannel(userId);
  const subscribed = await isUserSubscribed(userId);

  await ctx.reply(
    `🎛️ *COMMAND DASHBOARD · @${channel.toUpperCase()}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Choose an operation from the teleprinter:`,
    {
      parse_mode: "Markdown",
      reply_markup: buildMainMenuKeyboard(channel, subscribed),
    }
  );
});

// ─── /channel ────────────────────────────────────────────────────
bot.command("channel", async (ctx) => {
  try {
    if (!ctx.from) return;
    const userId = String(ctx.from.id);
    const input = ctx.match?.trim();

    if (!input) {
      const currentChannel = await getUserChannel(userId);
      await ctx.reply(
        `📡 *CHANNEL REGISTRY LEDGER*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Current monitored channel: *@${currentChannel}*\n\n` +
        `To switch channels, select a quick preset below or type:\n` +
        `\`/channel @username\``,
        {
          parse_mode: "Markdown",
          reply_markup: buildChannelPickerKeyboard(currentChannel),
        }
      );
      return;
    }

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
    } catch {}

    const roastLine = onboardingRoast ? `\n\n🔥 _First Impression:_ ${onboardingRoast}` : "";

    await ctx.reply(
      `✅ *Channel Switched to @${cleanUsername}!*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━${roastLine}\n\n` +
      `The scribes are now scraping telegraph wires for @${cleanUsername}.`,
      {
        parse_mode: "Markdown",
        reply_markup: new InlineKeyboard()
          .text("📖 Read Today's Digest", "menu_today")
          .text("📊 Lurk-O-Meter", "menu_lurkometer")
          .row()
          .text("« Return to Menu", "menu_main"),
      }
    );
  } catch (err) {
    await replyError(ctx, err);
  }
});

// ─── /today ──────────────────────────────────────────────────────
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
        `📰 *@${channel.toUpperCase()} DISPATCH* · ${localDateStr}\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Silence across the telegraph wires. No transmissions detected yet today.`,
        {
          parse_mode: "Markdown",
          reply_markup: buildDigestKeyboard(channel),
        }
      );
    } else {
      await ctx.reply(formatSummaryReply(channel, localDateStr, summary), {
        parse_mode: "Markdown",
        reply_markup: buildDigestKeyboard(channel),
      });
    }
  } catch (err) {
    await replyError(ctx, err);
  }
});

// ─── /yesterday ──────────────────────────────────────────────────
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
        `📰 *@${channel.toUpperCase()} DISPATCH* · ${localDateStr}\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `No archived transmissions found for yesterday.`,
        {
          parse_mode: "Markdown",
          reply_markup: buildDigestKeyboard(channel),
        }
      );
    } else {
      await ctx.reply(formatSummaryReply(channel, localDateStr, summary), {
        parse_mode: "Markdown",
        reply_markup: buildDigestKeyboard(channel),
      });
    }
  } catch (err) {
    await replyError(ctx, err);
  }
});

// ─── /lurkometer ─────────────────────────────────────────────────
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
    let gaugeBar: string;

    if (count === 0) {
      gaugeBar = "[ ░░░░░░░░░░░░░░░░ ] 0%";
      blasts = "🔇 QUIET";
      verdict = "Deafening silence across the wires. Zero broadcasts detected today.";
    } else if (count <= 3) {
      gaugeBar = "[ ██░░░░░░░░░░░░░░ ] 15%";
      blasts = "🎺 LOW ACTIVITY";
      verdict = "A light whisper from the channel. Micro-dosing content.";
    } else if (count <= 8) {
      gaugeBar = "[ ████░░░░░░░░░░░░ ] 35%";
      blasts = "🎺🎺 MODERATE BROADCAST";
      verdict = "Steady stream of dispatches. Notifications are gathering.";
    } else if (count <= 18) {
      gaugeBar = "[ ████████░░░░░░░░ ] 60%";
      blasts = "🎺🎺🎺 ELEVATED DELUGE";
      verdict = "Keyboards rattling, thumbs blistering, heavy broadcast volume.";
    } else if (count <= 35) {
      gaugeBar = "[ ████████████░░░░ ] 85%";
      blasts = "🎺🎺🎺🎺 CODE CRIMSON";
      verdict = "Unrelenting flurry. The 'mark as read' button has surrendered.";
    } else {
      gaugeBar = "[ ████████████████ ] 100% MAXIMUM";
      blasts = "🎺🎺🎺🎺🎺 DEFCON 1 DELUGE";
      verdict = "Apocalyptic broadcast event. An entire encyclopedia has dropped.";
    }

    await ctx.reply(
      `📊 *THE LURK-O-METER // @${channel.toUpperCase()}*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `*Activity Level:* ${blasts}\n` +
      `\`${gaugeBar}\`\n\n` +
      `*Transmissions Today:* *${count}*\n` +
      `*Date:* ${localDateStr}\n\n` +
      `_${verdict}_`,
      {
        parse_mode: "Markdown",
        reply_markup: new InlineKeyboard()
          .text("📖 Read Today's Digest", "menu_today")
          .text("🎲 Place Bet", "menu_guess")
          .row()
          .text("« Return to Menu", "menu_main"),
      }
    );
  } catch (err) {
    await replyError(ctx, err);
  }
};

bot.command("lurkometer", handleLurkometer);
bot.command("babiometer", handleLurkometer);

// ─── /roast ──────────────────────────────────────────────────────
bot.command("roast", async (ctx) => {
  try {
    if (!ctx.from) return;
    const channel = await getUserChannel(String(ctx.from.id));
    const roast = await withTyping(ctx, () => generateDailyRoast(channel));

    await ctx.reply(
      `🔥 *EDITORIAL SATIRICAL ROAST · @${channel.toUpperCase()}*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `${roast}\n\n` +
      `_Delivered by Groq Llama-3.3 Editorial Satire Engine._`,
      {
        parse_mode: "Markdown",
        reply_markup: new InlineKeyboard()
          .text("🔥 Another Roast", "menu_roast")
          .text("📖 Read Digest", "menu_today")
          .row()
          .text("« Return to Menu", "menu_main"),
      }
    );
  } catch (err) {
    await replyError(ctx, err);
  }
});

// ─── /excuse ─────────────────────────────────────────────────────
bot.command("excuse", async (ctx) => {
  try {
    if (!ctx.from) return;
    const channel = await getUserChannel(String(ctx.from.id));
    const excuse = generateExcuse(channel);

    await ctx.reply(
      `🛡️ *ROYAL EXCUSE DISPATCH*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `*Excuse for missing @${channel}'s dispatches:*\n\n` +
      `"${excuse}"\n\n` +
      `_Use responsibly. The Court takes zero liability._`,
      {
        parse_mode: "Markdown",
        reply_markup: new InlineKeyboard()
          .text("🛡️ Generate Another", "menu_excuse")
          .text("« Menu", "menu_main"),
      }
    );
  } catch (err) {
    await replyError(ctx, err);
  }
});

// ─── /guess (Betting Pool) ───────────────────────────────────────
bot.command("guess", async (ctx) => {
  try {
    if (!ctx.from) return;
    const input = ctx.match?.trim();
    const localDateStr = getEATDateStr(0);
    const userId = String(ctx.from.id);
    const displayName = getDisplayName(ctx);
    const channel = await getUserChannel(userId);

    await ensureChannelScraped(channel);

    const countRow = await withReadDb((db) =>
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(posts)
        .where(and(eq(posts.local_date, localDateStr), eq(posts.channel, channel)))
        .execute()
    );
    const actualCount = countRow[0]?.count ?? 0;

    // If no argument, show betting menu & board
    if (!input) {
      const todayGuesses = await withReadDb((db) =>
        db.select().from(guesses)
          .where(and(eq(guesses.local_date, localDateStr), eq(guesses.channel, channel))).execute()
      );

      let boardText = "No bets placed yet today. Be the first to wager!";
      if (todayGuesses.length > 0) {
        const sorted = todayGuesses
          .map(g => ({ ...g, diff: Math.abs(g.guess - actualCount) }))
          .sort((a, b) => a.diff - b.diff);

        boardText = sorted.map((g, i) => {
          const medal = i === 0 ? "👑" : i === 1 ? "🥈" : i === 2 ? "🥉" : "  ";
          return `${medal} ${g.display_name}: *${g.guess} posts* (diff: ${g.diff})`;
        }).join("\n");
      }

      await ctx.reply(
        `🎲 *THE ROYAL BETTING POOL · @${channel.toUpperCase()}*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `📊 *Actual count so far today:* *${actualCount}*\n\n` +
        `*Leaderboard:* \n${boardText}\n\n` +
        `Tap a quick bet below or type \`/guess 25\`:`,
        {
          parse_mode: "Markdown",
          reply_markup: buildGuessKeyboard(actualCount),
        }
      );
      return;
    }

    const guessNum = parseInt(input, 10);
    if (isNaN(guessNum) || guessNum < 0 || guessNum > 200) {
      await ctx.reply("🎲 Please enter a reasonable number: `/guess 25` (Range: 0–200)", { parse_mode: "Markdown" });
      return;
    }

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

    await ctx.reply(
      `🎲 *Bet Confirmed for @${channel}!* \n\n` +
      `*${displayName}* wagered *${guessNum}* posts today.\n` +
      `📊 Current transmissions count: *${actualCount}*`,
      {
        parse_mode: "Markdown",
        reply_markup: new InlineKeyboard()
          .text("🏆 View Pool", "menu_guess_board")
          .text("« Menu", "menu_main"),
      }
    );
  } catch (err) {
    await replyError(ctx, err);
  }
});

// ─── /subscribe & /unsubscribe ───────────────────────────────────
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
      `🕊️ *Royal Pigeon Dispatched!*\n\n` +
      `Every morning, a freshly synthesized scroll of @${channel}'s output will arrive automatically.`,
      {
        parse_mode: "Markdown",
        reply_markup: new InlineKeyboard().text("« Menu", "menu_main"),
      }
    );
  } catch (err) {
    await replyError(ctx, err);
  }
});

bot.command("unsubscribe", async (ctx) => {
  try {
    if (!ctx.from) return;
    const userId = String(ctx.from.id);

    await writeDb.update(subscribers)
      .set({ active: false })
      .where(eq(subscribers.telegram_user_id, userId));

    await ctx.reply(
      `❌ *Unsubscribed from Daily Delivery.*\n\n` +
      `The royal pigeon will no longer visit your dwelling.`,
      {
        parse_mode: "Markdown",
        reply_markup: new InlineKeyboard().text("« Menu", "menu_main"),
      }
    );
  } catch (err) {
    await replyError(ctx, err);
  }
});

// ─── /recommend ──────────────────────────────────────────────────
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
        LIMIT 4
      `),
    );

    if (recs.length === 0) {
      await ctx.reply(`🤷‍♂️ No other channels tracked in the kingdom yet. Type \`/channel @username\` to track one!`, { parse_mode: "Markdown" });
      return;
    }

    const kb = new InlineKeyboard();
    recs.forEach((r, idx) => {
      kb.text(`▶ @${r.channel} (${r.trackers} lurkers)`, `set_channel:${r.channel}`);
      kb.row();
    });
    kb.text("« Return to Menu", "menu_main");

    await ctx.reply(
      `🎯 *DISCOVERY: POPULAR CHANNELS*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Tap any channel below to track it immediately:`,
      {
        parse_mode: "Markdown",
        reply_markup: kb,
      }
    );
  } catch (err) {
    await replyError(ctx, err);
  }
});

// ─── CALLBACK QUERY HANDLERS (Interactive Tactile UI) ────────────

bot.callbackQuery("menu_main", async (ctx) => {
  const userId = String(ctx.from.id);
  const channel = await getUserChannel(userId);
  const subscribed = await isUserSubscribed(userId);
  const name = ctx.from.first_name || "Citizen";

  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    `📜 *✦ THE LURKENING · ROYAL GAZETTE ✦*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Greetings, *${name}*!\n\n` +
    `📡 *Active Channel:* *@${channel}*\n` +
    `🕊️ *Pigeon Delivery:* ${subscribed ? "Active [✓]" : "Disabled"}\n\n` +
    `Select a decree below:`,
    {
      parse_mode: "Markdown",
      reply_markup: buildMainMenuKeyboard(channel, subscribed),
    }
  );
});

bot.callbackQuery("menu_today", async (ctx) => {
  await ctx.answerCallbackQuery({ text: "Fetching today's digest..." });
  const localDateStr = getEATDateStr(0);
  const channel = await getUserChannel(String(ctx.from.id));

  const summary = await withTyping(ctx, () =>
    summarizeDay(channel, localDateStr, SUMMARY_LANGUAGE, false),
  );

  const text = summary.includes("No posts found")
    ? `📰 *@${channel.toUpperCase()} DISPATCH* · ${localDateStr}\n━━━━━━━━━━━━━━━━━━━━━━━━\n\nSilence across the wires. No transmissions detected yet today.`
    : formatSummaryReply(channel, localDateStr, summary);

  await ctx.reply(text, {
    parse_mode: "Markdown",
    reply_markup: buildDigestKeyboard(channel),
  });
});

bot.callbackQuery("menu_yesterday", async (ctx) => {
  await ctx.answerCallbackQuery({ text: "Fetching yesterday's recap..." });
  const localDateStr = getEATDateStr(-1);
  const channel = await getUserChannel(String(ctx.from.id));

  const summary = await withTyping(ctx, () =>
    summarizeDay(channel, localDateStr, SUMMARY_LANGUAGE, false),
  );

  const text = summary.includes("No posts found")
    ? `📰 *@${channel.toUpperCase()} DISPATCH* · ${localDateStr}\n━━━━━━━━━━━━━━━━━━━━━━━━\n\nNo transmissions found for yesterday.`
    : formatSummaryReply(channel, localDateStr, summary);

  await ctx.reply(text, {
    parse_mode: "Markdown",
    reply_markup: buildDigestKeyboard(channel),
  });
});

bot.callbackQuery("menu_lurkometer", async (ctx) => {
  await ctx.answerCallbackQuery();
  await handleLurkometer(ctx);
});

bot.callbackQuery("menu_roast", async (ctx) => {
  await ctx.answerCallbackQuery({ text: "Cooking a fresh roast..." });
  const channel = await getUserChannel(String(ctx.from.id));
  const roast = await withTyping(ctx, () => generateDailyRoast(channel));

  await ctx.reply(
    `🔥 *EDITORIAL SATIRICAL ROAST · @${channel.toUpperCase()}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `${roast}`,
    {
      parse_mode: "Markdown",
      reply_markup: new InlineKeyboard()
        .text("🔥 Another Roast", "menu_roast")
        .text("« Menu", "menu_main"),
    }
  );
});

bot.callbackQuery("menu_excuse", async (ctx) => {
  await ctx.answerCallbackQuery();
  const channel = await getUserChannel(String(ctx.from.id));
  const excuse = generateExcuse(channel);

  await ctx.reply(
    `🛡️ *ROYAL EXCUSE DISPATCH*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `"${excuse}"`,
    {
      parse_mode: "Markdown",
      reply_markup: new InlineKeyboard()
        .text("🛡️ Another Excuse", "menu_excuse")
        .text("« Menu", "menu_main"),
    }
  );
});

bot.callbackQuery("menu_channels", async (ctx) => {
  await ctx.answerCallbackQuery();
  const current = await getUserChannel(String(ctx.from.id));

  await ctx.editMessageText(
    `📡 *CHANNEL SWITCHER LEDGER*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Current: *@${current}*\n\n` +
    `Tap a quick preset below or type \`/channel @username\`:`,
    {
      parse_mode: "Markdown",
      reply_markup: buildChannelPickerKeyboard(current),
    }
  );
});

bot.callbackQuery(/^set_channel:(.+)$/, async (ctx) => {
  const newChannel = ctx.match[1].replace(/^@/, "").trim();
  const userId = String(ctx.from.id);

  await ctx.answerCallbackQuery({ text: `Switched to @${newChannel}!` });

  await writeDb.insert(userChannels).values({
    telegram_user_id: userId,
    channel: newChannel,
  }).onConflictDoUpdate({
    target: userChannels.telegram_user_id,
    set: { channel: newChannel, updated_at: new Date() },
  });

  userChannelCache.set(userId, newChannel, USER_CHANNEL_TTL_MS);
  ensureChannelScraped(newChannel).catch(() => {});

  const subscribed = await isUserSubscribed(userId);

  await ctx.editMessageText(
    `✅ *Active Channel Updated to @${newChannel}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Scraping telegraph wires and preparing intelligence.`,
    {
      parse_mode: "Markdown",
      reply_markup: buildMainMenuKeyboard(newChannel, subscribed),
    }
  );
});

bot.callbackQuery("menu_guess", async (ctx) => {
  await ctx.answerCallbackQuery();
  const channel = await getUserChannel(String(ctx.from.id));
  const localDateStr = getEATDateStr(0);

  const countRow = await withReadDb((db) =>
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(posts)
      .where(and(eq(posts.local_date, localDateStr), eq(posts.channel, channel)))
      .execute()
  );
  const actualCount = countRow[0]?.count ?? 0;

  await ctx.reply(
    `🎲 *BETTING POOL // @${channel.toUpperCase()}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Current transmissions: *${actualCount}*\n\n` +
    `Tap a wager below:`,
    {
      parse_mode: "Markdown",
      reply_markup: buildGuessKeyboard(actualCount),
    }
  );
});

bot.callbackQuery(/^make_guess:(\d+)$/, async (ctx) => {
  const guessNum = parseInt(ctx.match[1], 10);
  const userId = String(ctx.from.id);
  const displayName = getDisplayName(ctx);
  const channel = await getUserChannel(userId);
  const localDateStr = getEATDateStr(0);

  await ctx.answerCallbackQuery({ text: `Bet placed: ${guessNum} posts!` });

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

  await ctx.reply(
    `🎲 *Bet Confirmed!* \n\n` +
    `*${displayName}* bets *${guessNum}* posts today on @${channel}.`,
    {
      parse_mode: "Markdown",
      reply_markup: new InlineKeyboard()
        .text("🏆 Leaderboard", "menu_guess_board")
        .text("« Menu", "menu_main"),
    }
  );
});

bot.callbackQuery("menu_guess_board", async (ctx) => {
  await ctx.answerCallbackQuery();
  const channel = await getUserChannel(String(ctx.from.id));
  const localDateStr = getEATDateStr(0);

  const countRow = await withReadDb((db) =>
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(posts)
      .where(and(eq(posts.local_date, localDateStr), eq(posts.channel, channel)))
      .execute()
  );
  const actualCount = countRow[0]?.count ?? 0;

  const todayGuesses = await withReadDb((db) =>
    db.select().from(guesses)
      .where(and(eq(guesses.local_date, localDateStr), eq(guesses.channel, channel))).execute()
  );

  let boardText = "No bets placed yet today.";
  if (todayGuesses.length > 0) {
    const sorted = todayGuesses
      .map(g => ({ ...g, diff: Math.abs(g.guess - actualCount) }))
      .sort((a, b) => a.diff - b.diff);

    boardText = sorted.map((g, i) => {
      const medal = i === 0 ? "👑" : i === 1 ? "🥈" : i === 2 ? "🥉" : "  ";
      return `${medal} ${g.display_name}: *${g.guess}* (diff: ${g.diff})`;
    }).join("\n");
  }

  await ctx.reply(
    `🏆 *BETTING LEADERBOARD · @${channel.toUpperCase()}*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `📊 Actual count so far: *${actualCount}*\n\n` +
    `${boardText}`,
    {
      parse_mode: "Markdown",
      reply_markup: new InlineKeyboard()
        .text("🎲 Place Bet", "menu_guess")
        .text("« Menu", "menu_main"),
    }
  );
});

bot.callbackQuery("menu_subscribe_toggle", async (ctx) => {
  const userId = String(ctx.from.id);
  const chatId = String(ctx.chat?.id || ctx.from.id);
  const channel = await getUserChannel(userId);
  const currentSub = await isUserSubscribed(userId);

  if (currentSub) {
    await writeDb.update(subscribers).set({ active: false }).where(eq(subscribers.telegram_user_id, userId));
    await ctx.answerCallbackQuery({ text: "Unsubscribed from daily delivery." });
  } else {
    await writeDb.insert(subscribers).values({ telegram_user_id: userId, chat_id: chatId, active: true })
      .onConflictDoUpdate({ target: subscribers.telegram_user_id, set: { active: true, chat_id: chatId } });
    await ctx.answerCallbackQuery({ text: "Subscribed to daily delivery!" });
  }

  await ctx.editMessageReplyMarkup({
    reply_markup: buildMainMenuKeyboard(channel, !currentSub),
  });
});

bot.callbackQuery("menu_recommend", async (ctx) => {
  await ctx.answerCallbackQuery();
  const channel = await getUserChannel(String(ctx.from.id));

  const recs = await withReadDb((db) =>
    db.execute<{ channel: string; trackers: number }>(sql`
      SELECT channel, count(*)::int AS trackers
      FROM user_channels
      WHERE lower(channel) <> lower(${channel})
      GROUP BY channel
      ORDER BY trackers DESC, channel ASC
      LIMIT 4
    `),
  );

  const kb = new InlineKeyboard();
  recs.forEach((r) => {
    kb.text(`▶ @${r.channel} (${r.trackers} lurkers)`, `set_channel:${r.channel}`).row();
  });
  kb.text("« Return to Menu", "menu_main");

  await ctx.editMessageText(
    `🎯 *RECOMMENDED TELEGRAM CHANNELS*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Tap any channel to switch your active tracking:`,
    {
      parse_mode: "Markdown",
      reply_markup: kb,
    }
  );
});

// ─── FALLBACK HANDLER ────────────────────────────────────────────
bot.on("message", async (ctx) => {
  const text = ctx.message.text || "";
  const opening = text.startsWith("/")
    ? `The herald squints at your decree: "${text}" is not recognized.`
    : `The herald received your message.`;

  const userId = String(ctx.from.id);
  const channel = await getUserChannel(userId);
  const subscribed = await isUserSubscribed(userId);

  await ctx.reply(
    `🤨 *COURT TELEPRINTER*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `${opening}\n\n` +
    `Select a command decree below:`,
    {
      parse_mode: "Markdown",
      reply_markup: buildMainMenuKeyboard(channel, subscribed),
    }
  );
});
