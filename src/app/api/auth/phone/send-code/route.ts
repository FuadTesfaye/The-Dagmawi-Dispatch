import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramPhoneCode } from '@/lib/telegram-phone-auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawPhone = (body.phone || '').trim();

    if (!rawPhone) {
      return NextResponse.json({ error: 'Please enter your phone number' }, { status: 400 });
    }

    const result = await sendTelegramPhoneCode(rawPhone);

    return NextResponse.json({
      success: true,
      sessionId: result.sessionId,
      phone: result.normalizedPhone,
      isCodeViaApp: result.isCodeViaApp,
    });
  } catch (err: any) {
    console.error('[auth/phone/send-code] Error sending code:', err);
    let errorMessage = err.message || 'Failed to send Telegram code';

    if (errorMessage.includes('PHONE_NUMBER_INVALID')) {
      errorMessage = 'Invalid phone number format. Please include your country code (e.g. +251 92 411 3086).';
    } else if (errorMessage.includes('FLOOD_WAIT')) {
      errorMessage = 'Too many attempts. Telegram rate limit reached, please try again in a few minutes.';
    }

    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}
