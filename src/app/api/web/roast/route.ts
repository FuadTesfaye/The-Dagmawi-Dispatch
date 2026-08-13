import { NextResponse } from "next/server";
import { generatePersonalizedRoast } from "@/lib/roasts";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const channel = searchParams.get("channel") || "dagmawi_babi";

  try {
    const roast = await generatePersonalizedRoast(channel);
    return NextResponse.json({ roast, channel });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
