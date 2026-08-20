import { NextRequest, NextResponse } from 'next/server';
import { verifyTelegramWebAppData, createSessionCookie } from '@/lib/auth';
import { writeDb } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { initData } = body;

    if (!initData) {
      return NextResponse.json({ error: 'Missing initData' }, { status: 400 });
    }

    const verified = verifyTelegramWebAppData(initData);
    if (!verified || !verified.user) {
      return NextResponse.json({ error: 'Invalid WebApp signature or missing user payload' }, { status: 401 });
    }

    const { user: tgUser } = verified;
    const displayName =
      `${tgUser.first_name || ''} ${tgUser.last_name || ''}`.trim() || tgUser.username || `Telegram User #${tgUser.id}`;

    // Upsert user in Postgres
    const existing = await writeDb
      .select()
      .from(users)
      .where(eq(users.telegramUserId, String(tgUser.id)))
      .limit(1);

    let userRecord;
    if (existing.length > 0) {
      const updated = await writeDb
        .update(users)
        .set({
          username: tgUser.username || null,
          displayName,
          photoUrl: tgUser.photo_url || null,
          lastLoginAt: new Date(),
        })
        .where(eq(users.id, existing[0].id))
        .returning();
      userRecord = updated[0];
    } else {
      const inserted = await writeDb
        .insert(users)
        .values({
          telegramUserId: String(tgUser.id),
          username: tgUser.username || null,
          displayName,
          photoUrl: tgUser.photo_url || null,
          role: 'user',
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
    console.error('[auth/telegram-webapp] Error processing webapp login:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
