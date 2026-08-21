import { NextRequest, NextResponse } from 'next/server';
import { getReadDb, writeDb } from '@/db';
import { posts, trackedChannels, channelRoasts } from '@/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { generateCrossChannelDigest, generateChannelRoast } from '@/lib/ai';

export const dynamic = 'force-dynamic';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const APP_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://thelurkening.com';

async function sendTelegramMessage(chatId: number | string, text: string, replyMarkup?: any) {
  if (!TELEGRAM_BOT_TOKEN) return;

  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: replyMarkup,
      }),
    });
  } catch (err) {
    console.error('[telegram-webhook] Error sending telegram message:', err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();

    const message = update.message || update.edited_message;
    if (!message || !message.chat) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const rawText = (message.text || '').trim();

    if (!rawText) {
      return NextResponse.json({ ok: true });
    }

    const lowerText = rawText.toLowerCase();

    // ─── COMMAND: /start ──────────────────────────────────────────
    if (lowerText === '/start') {
      const welcomeText =
        `👋 <b>Welcome to The Lurkening Telegram Assistant!</b>\n\n` +
        `I summarize monitored Telegram channels in real time so you don't have to scroll hundreds of messages.\n\n` +
        `⚡ <b>Quick Commands:</b>\n` +
        `• /today or /catchup — 60-second summary of today's top posts\n` +
        `• /channels — List all monitored channels\n` +
        `• /roast <i>channel</i> — Generate an AI roast of recent posts\n` +
        `• /search <i>keyword</i> — Search telegram post archives`;

      const replyMarkup = {
        inline_keyboard: [
          [
            {
              text: '⚡ Read Today\'s 60s Catch-Up',
              callback_data: 'cmd_today',
            },
          ],
          [
            {
              text: '📱 Open Lurkening WebApp',
              web_app: { url: APP_URL },
            },
          ],
        ],
      };

      await sendTelegramMessage(chatId, welcomeText, replyMarkup);
      return NextResponse.json({ ok: true });
    }

    // ─── COMMAND: /today OR /catchup ──────────────────────────────
    if (lowerText.startsWith('/today') || lowerText.startsWith('/catchup') || lowerText.startsWith('/digest')) {
      const db = getReadDb();
      const recentPosts = await db
        .select()
        .from(posts)
        .orderBy(desc(posts.date))
        .limit(25);

      if (recentPosts.length === 0) {
        await sendTelegramMessage(
          chatId,
          `ℹ️ No transmissions logged yet for today. Check back shortly!`
        );
        return NextResponse.json({ ok: true });
      }

      // Group posts by channel
      const channelPostsMap: Record<string, string[]> = {};
      recentPosts.forEach((p) => {
        if (!channelPostsMap[p.channel]) channelPostsMap[p.channel] = [];
        if (p.text) channelPostsMap[p.channel].push(p.text.slice(0, 150));
      });

      const digestPayload = Object.entries(channelPostsMap).map(([ch, texts]) => ({
        channel: ch,
        channelName: `@${ch}`,
        posts: texts,
      }));

      const aiDigest = await generateCrossChannelDigest(digestPayload);

      let replyMsg = `⚡ <b>TODAY'S TELEGRAM BRIEFING</b>\n\n`;
      replyMsg += `📌 <b>${aiDigest.headline || 'Daily Wire Digest'}</b>\n\n`;
      replyMsg += `${aiDigest.overviewSummary || 'Here is what happened across monitored channels today.'}\n\n`;
      replyMsg += `<b>Channel Breakdown:</b>\n`;

      aiDigest.channelHighlights?.slice(0, 4).forEach((h) => {
        replyMsg += `• <b>${h.channelName}</b> (${h.postCount} posts): ${h.topStory}\n`;
      });

      const replyMarkup = {
        inline_keyboard: [
          [
            {
              text: '📱 Open Full Archive & WebApp',
              web_app: { url: APP_URL },
            },
          ],
        ],
      };

      await sendTelegramMessage(chatId, replyMsg, replyMarkup);
      return NextResponse.json({ ok: true });
    }

    // ─── COMMAND: /channels ───────────────────────────────────────
    if (lowerText.startsWith('/channels')) {
      const db = getReadDb();
      const allChannels = await db.select().from(trackedChannels).limit(15);

      let reply = `📡 <b>Monitored Telegram Channels (${allChannels.length}):</b>\n\n`;
      allChannels.forEach((c) => {
        reply += `• <b>${c.name}</b> (@${c.id}) — ${c.subscriberCount || 0} followers\n`;
      });

      reply += `\nUse /today to get a summary of all channels at once.`;

      await sendTelegramMessage(chatId, reply);
      return NextResponse.json({ ok: true });
    }

    // ─── COMMAND: /search ─────────────────────────────────────────
    if (lowerText.startsWith('/search')) {
      const query = rawText.replace(/^\/search/i, '').trim();
      if (!query) {
        await sendTelegramMessage(chatId, `🔍 <b>Usage:</b> <code>/search &lt;keyword&gt;</code>\nExample: <code>/search ai</code>`);
        return NextResponse.json({ ok: true });
      }

      const db = getReadDb();
      const results = await db
        .select()
        .from(posts)
        .where(sql`${posts.text} ILIKE ${`%${query}%`}`)
        .orderBy(desc(posts.date))
        .limit(5);

      if (results.length === 0) {
        await sendTelegramMessage(chatId, `🔍 No posts found matching "<b>${query}</b>".`);
        return NextResponse.json({ ok: true });
      }

      let reply = `🔍 <b>Search results for "${query}":</b>\n\n`;
      results.forEach((r, idx) => {
        const snippet = r.text ? r.text.slice(0, 120) + '...' : '[Media post]';
        reply += `<b>${idx + 1}. @${r.channel} (#${r.id})</b>\n${snippet}\n<a href="${APP_URL}/post/${r.id}?channel=${r.channel}">Read post →</a>\n\n`;
      });

      await sendTelegramMessage(chatId, reply);
      return NextResponse.json({ ok: true });
    }

    // ─── COMMAND: /roast ──────────────────────────────────────────
    if (lowerText.startsWith('/roast')) {
      const targetChannel = rawText.replace(/^\/roast/i, '').trim().replace(/^@/, '') || 'dagmawi_babi';
      const db = getReadDb();
      const chPosts = await db
        .select()
        .from(posts)
        .where(eq(posts.channel, targetChannel))
        .orderBy(desc(posts.date))
        .limit(10);

      const roastResult = await generateChannelRoast(
        targetChannel,
        chPosts.length,
        chPosts.map((p) => p.text || '')
      );

      const roastMsg =
        `🔥 <b>AI Roast of @${targetChannel}</b> (Chaos Score: ${roastResult.chaosScore}/100)\n\n` +
        `<i>"${roastResult.content}"</i>`;

      await sendTelegramMessage(chatId, roastMsg);
      return NextResponse.json({ ok: true });
    }

    // Default reply
    await sendTelegramMessage(
      chatId,
      `I didn't recognize that command. Type /today for today's summary or /search <query> to find posts.`
    );
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[telegram-webhook] Error processing update:', err);
    return NextResponse.json({ ok: true });
  }
}
