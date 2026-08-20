import { NextResponse } from "next/server";
import { bot } from "@/lib/bot";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const webhookUrl = `${url.origin}/api/telegram`;

    // Set the webhook via Grammy
    await bot.api.setWebhook(webhookUrl);

    // Register official Telegram command list
    await bot.api.setMyCommands([
      { command: "menu", description: "🎛️ Interactive command dashboard" },
      { command: "today", description: "📖 Today's executive dispatch summary" },
      { command: "yesterday", description: "📜 Yesterday's recap scroll" },
      { command: "lurkometer", description: "📊 Real-time 24h activity gauge" },
      { command: "roast", description: "🔥 Unhinged AI satirical roast" },
      { command: "channel", description: "📡 Switch or view monitored channel" },
      { command: "guess", description: "🎲 Bet on today's post count" },
      { command: "excuse", description: "🛡️ Royal excuse generator" },
      { command: "recommend", description: "🎯 Popular channel recommendations" },
      { command: "subscribe", description: "🕊️ Morning daily digest delivery" },
      { command: "unsubscribe", description: "❌ Stop daily digest delivery" },
    ]);

    return NextResponse.json({
      success: true,
      message: `Webhook successfully set to ${webhookUrl} and commands registered!`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
