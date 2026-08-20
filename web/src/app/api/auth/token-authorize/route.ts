import { NextRequest, NextResponse } from 'next/server';
import { authorizePendingToken } from '@/lib/auth-token-store';
import { writeDb } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const expectedSecret = process.env.TELEGRAM_BOT_TOKEN || '8594522566:AAHVkA-aYSwKWD7WyOqdeN_CfXBq0CKldws';

    if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'Unauthorized bot call' }, { status: 401 });
    }

    const body = await req.json();
    const { token, telegramUserId, username, displayName, photoUrl } = body;

    if (!token || !telegramUserId) {
      return NextResponse.json({ error: 'Missing required payload' }, { status: 400 });
    }

    // Upsert user into database
    let userRecord;
    try {
      const existingUser = await writeDb
        .select()
        .from(users)
        .where(eq(users.telegramUserId, String(telegramUserId)))
        .limit(1);

      if (existingUser.length > 0) {
        const updated = await writeDb
          .update(users)
          .set({
            username: username || null,
            displayName: displayName || username || `User #${telegramUserId}`,
            photoUrl: photoUrl || null,
            lastLoginAt: new Date(),
          })
          .where(eq(users.id, existingUser[0].id))
          .returning();
        userRecord = updated[0];
      } else {
        const inserted = await writeDb
          .insert(users)
          .values({
            telegramUserId: String(telegramUserId),
            username: username || null,
            displayName: displayName || username || `User #${telegramUserId}`,
            photoUrl: photoUrl || null,
            role: 'user',
          })
          .returning();
        userRecord = inserted[0];
      }
    } catch (dbErr) {
      console.warn('[auth/token-authorize] Database write bypassed (using session record):', dbErr);
      userRecord = {
        id: `usr_${telegramUserId}`,
        telegramUserId: String(telegramUserId),
        username: username || null,
        displayName: displayName || username || `User #${telegramUserId}`,
        photoUrl: photoUrl || null,
        role: 'user',
      };
    }

    const authorized = authorizePendingToken(token, {
      id: userRecord.id,
      telegramUserId: userRecord.telegramUserId,
      username: userRecord.username,
      displayName: userRecord.displayName,
      photoUrl: userRecord.photoUrl,
      role: userRecord.role as any,
    });

    if (!authorized) {
      return NextResponse.json({ error: 'Token expired or not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: userRecord,
    });
  } catch (err: any) {
    console.error('[auth/token-authorize] Error authorizing token:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
