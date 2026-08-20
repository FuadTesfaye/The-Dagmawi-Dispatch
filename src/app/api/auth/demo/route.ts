import { NextRequest, NextResponse } from 'next/server';
import { createSessionCookie } from '@/lib/auth';
import { writeDb } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

const DEMO_PERSONAS = {
  admin: {
    telegramUserId: '999999999',
    username: 'royal_herald',
    displayName: 'Royal Herald (Court Admin)',
    photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=herald',
    role: 'admin' as const,
  },
  reader: {
    telegramUserId: '888888888',
    username: 'scribe_apprentice',
    displayName: 'Scribe Apprentice',
    photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=apprentice',
    role: 'user' as const,
  },
  vip: {
    telegramUserId: '777777777',
    username: 'babi_enthusiast',
    displayName: 'Babi Superfan',
    photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=superfan',
    role: 'user' as const,
  },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const personaKey = (body.persona as keyof typeof DEMO_PERSONAS) || 'admin';
    const persona = DEMO_PERSONAS[personaKey] || DEMO_PERSONAS.admin;

    let userRecord;
    try {
      const existing = await writeDb
        .select()
        .from(users)
        .where(eq(users.telegramUserId, persona.telegramUserId))
        .limit(1);

      if (existing.length > 0) {
        const updated = await writeDb
          .update(users)
          .set({
            displayName: persona.displayName,
            username: persona.username,
            photoUrl: persona.photoUrl,
            role: persona.role,
            lastLoginAt: new Date(),
          })
          .where(eq(users.id, existing[0].id))
          .returning();
        userRecord = updated[0];
      } else {
        const inserted = await writeDb
          .insert(users)
          .values({
            telegramUserId: persona.telegramUserId,
            username: persona.username,
            displayName: persona.displayName,
            photoUrl: persona.photoUrl,
            role: persona.role,
          })
          .returning();
        userRecord = inserted[0];
      }
    } catch (dbErr) {
      console.warn('[auth/demo] Database write bypassed (using session):', dbErr);
      userRecord = {
        id: `demo_${personaKey}`,
        telegramUserId: persona.telegramUserId,
        username: persona.username,
        displayName: persona.displayName,
        photoUrl: persona.photoUrl,
        role: persona.role,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
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
    console.error('[auth/demo] Error creating demo session:', err);
    return NextResponse.json({ error: 'Failed to create demo session' }, { status: 500 });
  }
}
