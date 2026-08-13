import { NextRequest, NextResponse } from "next/server";
import { getChannel, ApiError } from "@/lib/search-engine/api";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const id = Number(resolvedParams.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  try {
    const data = await getChannel(id);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    const status = err instanceof ApiError ? 502 : 500;
    return NextResponse.json({ error: "backend unavailable" }, { status });
  }
}
