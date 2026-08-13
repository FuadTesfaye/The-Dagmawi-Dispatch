import { NextResponse } from "next/server";
import { scrapePublicChannelFast } from "@/lib/telegram/scraper";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const channel = searchParams.get("channel") || "sifendev";
  
  try {
    const inserted = await scrapePublicChannelFast(channel);
    
    // Check how many we have now
    const channelPosts = await db.select().from(posts).where(eq(posts.channel, channel)).execute();
    
    return NextResponse.json({
      success: true,
      inserted,
      totalPostsInDb: channelPosts.length,
      sample: channelPosts.slice(0, 3)
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: String(err)
    });
  }
}
