import { NextRequest, NextResponse } from 'next/server';
import { verifyTelegramPhoneCode } from '@/lib/telegram-phone-auth';
import { createSessionCookie } from '@/lib/auth';
import { writeDb } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { sessionId, code, password } = body;

    if (!sessionId || !code) {
      return NextResponse.json({ error: 'Missing session ID or verification code' }, { status: 400 });
    }

    let telegramUser;
    try {
      telegramUser = await verifyTelegramPhoneCode(sessionId, code, password);
    } catch (authErr: any) {
      if (authErr.message === '2FA_REQUIRED') {
        return NextResponse.json({ requires2FA: true, message: 'Please enter your Telegram 2FA cloud password' });
      }
      throw authErr;
    }

    // Upsert user into database
    let userRecord;
    try {
      const existing = await writeDb
        .select()
        .from(users)
        .where(eq(users.telegramUserId, telegramUser.id))
        .limit(1);

      if (existing.length > 0) {
        const updated = await writeDb
          .update(users)
          .set({
            username: telegramUser.username,
            displayName: telegramUser.displayName,
            photoUrl: telegramUser.photoUrl || existing[0].photoUrl,
            lastLoginAt: new Date(),
          })
          .where(eq(users.id, existing[0].id))
          .returning();
        userRecord = updated[0];
      } else {
        const inserted = await writeDb
          .insert(users)
          .values({
            telegramUserId: telegramUser.id,
            username: telegramUser.username,
            displayName: telegramUser.displayName,
            photoUrl: telegramUser.photoUrl,
            role: 'user',
          })
          .returning();
        userRecord = inserted[0];
      }
    } catch (dbErr) {
      console.warn('[auth/phone/verify-code] Database write bypassed (using session):', dbErr);
      userRecord = {
        id: `tg_${telegramUser.id}`,
        telegramUserId: telegramUser.id,
        username: telegramUser.username,
        displayName: telegramUser.displayName,
        photoUrl: telegramUser.photoUrl,
        role: 'user',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
    }

    // Set secure JWT session cookie
    await createSessionCookie({
      id: userRecord.id,
      telegramUserId: userRecord.telegramUserId,
      username: userRecord.username,
      displayName: userRecord.displayName,
      photoUrl: userRecord.photoUrl,
      role: userRecord.role as any,
    });

    return NextResponse.json({
      success: true,
      user: userRecord,
    });
  } catch (err: any) {
    console.error('[auth/phone/verify-code] Verification error:', err);
    let message = err.message || 'Invalid verification code';

    if (message.includes('PHONE_CODE_INVALID')) {
      message = 'The 5-digit verification code you entered is incorrect.';
    } else if (message.includes('PHONE_CODE_EXPIRED')) {
      message = 'The verification code has expired. Please request a new code.';
    } else if (message.includes('PASSWORD_HASH_INVALID')) {
      message = 'Incorrect 2FA Cloud Password.';
    }

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
