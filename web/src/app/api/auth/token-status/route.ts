import { NextRequest, NextResponse } from 'next/server';
import { getPendingToken, consumeToken } from '@/lib/auth-token-store';
import { createSessionCookie } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token');
    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }

    const entry = getPendingToken(token);
    if (!entry) {
      return NextResponse.json({ status: 'expired' }, { status: 404 });
    }

    if (entry.status === 'authorized' && entry.user) {
      // Create session cookie
      await createSessionCookie(entry.user);
      consumeToken(token);

      return NextResponse.json({
        status: 'authorized',
        user: entry.user,
      });
    }

    return NextResponse.json({
      status: entry.status,
    });
  } catch (err: any) {
    console.error('[auth/token-status] Error checking status:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
