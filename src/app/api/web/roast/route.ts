import { NextResponse } from "next/server";
import { generatePersonalizedRoast } from "@/lib/roasts";
import { toHumanError } from "@/lib/human-errors";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const channel = searchParams.get("channel") || "dagmawi_babi";

  try {
    const roast = await generatePersonalizedRoast(channel);
    return NextResponse.json({ roast, channel });
  } catch (err: unknown) {
    return NextResponse.json({ error: toHumanError(err, "api") }, { status: 500 });
  }
}
