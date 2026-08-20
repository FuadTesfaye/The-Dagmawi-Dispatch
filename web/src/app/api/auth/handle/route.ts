import { NextRequest, NextResponse } from 'next/server';
import { createSessionCookie } from '@/lib/auth';
import { writeDb } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawUsername = (body.username || '').trim();
    const rawDisplayName = (body.displayName || '').trim();

    if (!rawUsername && !rawDisplayName) {
      return NextResponse.json(
        { error: 'Please specify a username or display name' },
        { status: 400 }
      );
    }

    const cleanUsername = rawUsername.replace(/^@+/, '').toLowerCase() || `scribe_${Math.random().toString(36).slice(2, 7)}`;
    const displayName = rawDisplayName || (rawUsername ? `@${cleanUsername}` : `Scribe ${cleanUsername}`);
    const telegramUserId = `web_${cleanUsername}`;
    const photoUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`;

    // Check if user already exists
    const existing = await writeDb
      .select()
      .from(users)
      .where(eq(users.telegramUserId, telegramUserId))
      .limit(1);

    let userRecord;
    if (existing.length > 0) {
      const updated = await writeDb
        .update(users)
        .set({
          username: cleanUsername,
          displayName,
          photoUrl: existing[0].photoUrl || photoUrl,
          lastLoginAt: new Date(),
        })
        .where(eq(users.id, existing[0].id))
        .returning();
      userRecord = updated[0];
    } else {
      const inserted = await writeDb
        .insert(users)
        .values({
          telegramUserId,
          username: cleanUsername,
          displayName,
          photoUrl,
          role: cleanUsername === 'admin' || cleanUsername === 'fuad' ? 'admin' : 'user',
        })
        .returning();
      userRecord = inserted[0];
    }

    await createSessionCookie({
      id: userRecord.id,
      telegramUserId: userRecord.telegramUserId,
      username: userRecord.username,
      displayName: userRecord.displayName,
      photoUrl: userRecord.photoUrl,
      role: userRecord.role as any,
    });

    return NextResponse.json({ success: true, user: userRecord });
  } catch (err: any) {
    console.error('[auth/handle] Error logging in via handle:', err);
    return NextResponse.json({ error: 'Failed to authenticate handle' }, { status: 500 });
  }
}
