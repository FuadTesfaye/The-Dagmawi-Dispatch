import { webhookCallback } from "grammy";
import { bot } from "@/lib/bot";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const handle = webhookCallback(bot, "std/http");

export async function POST(req: Request) {
  try {
    return await handle(req);
  } catch (err: any) {
    console.error("Telegram Webhook Error:", err?.stack || err);
    return new Response("OK", { status: 200 });
  }
}
