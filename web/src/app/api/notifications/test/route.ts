import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const channel = body.channel || 'dagmawi_babi';
    const message = body.message || '✦ ROYAL BULLETIN: Telecommunication and autonomous intelligence channels operational.';

    return NextResponse.json({
      success: true,
      notification: {
        title: `✦ Breaking Dispatch (@${channel})`,
        body: message,
        icon: `https://api.dicebear.com/7.x/bottts/svg?seed=${channel}`,
        url: `/channel/${channel}`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to generate test notification' }, { status: 500 });
  }
}
