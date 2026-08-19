import { NextRequest, NextResponse } from 'next/server';
import { verifyTelegramAuth, createSessionCookie, TelegramAuthData } from '@/lib/auth';
import { writeDb } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const id = searchParams.get('id');
  const hash = searchParams.get('hash');
  const authDate = searchParams.get('auth_date');
  const firstName = searchParams.get('first_name') || '';
  const lastName = searchParams.get('last_name') || '';
  const username = searchParams.get('username') || null;
  const photoUrl = searchParams.get('photo_url') || null;

  if (!id || !hash || !authDate) {
    return NextResponse.redirect(new URL('/login?error=invalid_payload', req.url));
  }

  const authData: TelegramAuthData = {
    id,
    first_name: firstName,
    last_name: lastName,
    username: username || undefined,
    photo_url: photoUrl || undefined,
    auth_date: authDate,
    hash,
  };

  const isValid = verifyTelegramAuth(authData);
  if (!isValid) {
    return NextResponse.redirect(new URL('/login?error=signature_failed', req.url));
  }

  const displayName = `${firstName} ${lastName}`.trim() || username || `Telegram User #${id}`;

  // Upsert user into database
  const existingUser = await writeDb
    .select()
    .from(users)
    .where(eq(users.telegramUserId, String(id)))
    .limit(1);

  let userRecord;
  if (existingUser.length > 0) {
    const updated = await writeDb
      .update(users)
      .set({
        username,
        displayName,
        photoUrl,
        lastLoginAt: new Date(),
      })
      .where(eq(users.id, existingUser[0].id))
      .returning();
    userRecord = updated[0];
  } else {
    const inserted = await writeDb
      .insert(users)
      .values({
        telegramUserId: String(id),
        username,
        displayName,
        photoUrl,
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

  return NextResponse.redirect(new URL('/', req.url));
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as TelegramAuthData;
    if (!body || !body.id || !body.hash) {
      return NextResponse.json({ error: 'Missing auth payload' }, { status: 400 });
    }

    const isValid = verifyTelegramAuth(body);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 });
    }

    const displayName =
      `${body.first_name || ''} ${body.last_name || ''}`.trim() || body.username || `User #${body.id}`;

    const existingUser = await writeDb
      .select()
      .from(users)
      .where(eq(users.telegramUserId, String(body.id)))
      .limit(1);

    let userRecord;
    if (existingUser.length > 0) {
      const updated = await writeDb
        .update(users)
        .set({
          username: body.username || null,
          displayName,
          photoUrl: body.photo_url || null,
          lastLoginAt: new Date(),
        })
        .where(eq(users.id, existingUser[0].id))
        .returning();
      userRecord = updated[0];
    } else {
      const inserted = await writeDb
        .insert(users)
        .values({
          telegramUserId: String(body.id),
          username: body.username || null,
          displayName,
          photoUrl: body.photo_url || null,
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
    console.error('[auth/telegram] Error processing auth:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
