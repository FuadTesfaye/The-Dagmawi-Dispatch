import { NextResponse } from "next/server";
import { generateExcuse } from "@/lib/roasts";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const channel = searchParams.get("channel") || "dagmawi_babi";
  const excuse = generateExcuse(channel);
  return NextResponse.json({ excuse, channel });
}
