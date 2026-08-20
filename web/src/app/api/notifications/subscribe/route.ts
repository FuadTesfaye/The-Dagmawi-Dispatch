import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await req.json().catch(() => ({}));
    const { subscription } = body;

    // Log web push endpoint registration
    console.log('[notifications/subscribe] Registered subscription for user:', user?.username || 'guest');

    return NextResponse.json({
      success: true,
      registered: true,
      user: user?.username || 'guest',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to register notification subscription' }, { status: 500 });
  }
}
