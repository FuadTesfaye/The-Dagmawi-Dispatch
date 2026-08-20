import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createPendingToken } from '@/lib/auth-token-store';
import { TELEGRAM_BOT_USERNAME } from '@/lib/constants';

export async function POST() {
  try {
    const token = `lurk_${crypto.randomBytes(12).toString('hex')}`;
    createPendingToken(token);

    const botUsername = TELEGRAM_BOT_USERNAME;
    const deepLink = `https://t.me/${botUsername}?start=${token}`;

    return NextResponse.json({
      success: true,
      token,
      botUsername,
      deepLink,
    });
  } catch (err: any) {
    console.error('[auth/token-request] Error creating token:', err);
    return NextResponse.json({ error: 'Failed to create auth token' }, { status: 500 });
  }
}
