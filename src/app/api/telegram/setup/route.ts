import { NextResponse } from "next/server";
import { bot } from "@/lib/bot";

export async function GET(request: Request) {
  try {
    // Get the base URL from the request (e.g., https://your-app.vercel.app)
    const url = new URL(request.url);
    const webhookUrl = `${url.origin}/api/telegram`;
    
    // Set the webhook via Grammy
    await bot.api.setWebhook(webhookUrl);
    
    return NextResponse.json({ 
      success: true, 
      message: `Webhook successfully set to ${webhookUrl}!`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
