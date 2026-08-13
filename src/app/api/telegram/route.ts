import { webhookCallback } from "grammy";
import { bot } from "@/lib/bot";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Grammy's webhook handler adapted for Next.js App Router
export const POST = webhookCallback(bot, "std/http");
