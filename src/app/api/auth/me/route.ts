import { NextResponse } from 'next/server';
import { getCurrentUser, clearSessionCookie } from '@/lib/auth';
import { withReadDb } from '@/db';
import { subscriptions } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ user: null });
    }

    // Fetch user subscription count
    const subCount = await withReadDb((db) =>
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(subscriptions)
        .where(eq(subscriptions.userId, user.id))
    );

    return NextResponse.json({
      user: {
        ...user,
        subscriptionCount: subCount[0]?.count || 0,
      },
    });
  } catch (err: any) {
    console.error('[auth/me] Error fetching session:', err);
    return NextResponse.json({ user: null });
  }
}

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ success: true, message: 'Logged out successfully' });
}

export async function DELETE() {
  await clearSessionCookie();
  return NextResponse.json({ success: true, message: 'Logged out successfully' });
}
