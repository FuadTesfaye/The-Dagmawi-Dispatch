import { webhookCallback } from "grammy";
import { bot } from "@/lib/bot";

// Grammy's webhook handler adapted for Next.js App Router
export const POST = webhookCallback(bot, "std/http");
