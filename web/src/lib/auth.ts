import crypto from 'crypto';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { User } from './types';

const SESSION_COOKIE = 'dispatch_session';
const JWT_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || process.env.TELEGRAM_BOT_TOKEN || 'default-super-secret-telegram-dispatch-jwt-key-2026'
);

export interface TelegramAuthData {
  id: number | string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number | string;
  hash: string;
}

/**
 * Verifies the integrity of Telegram Login Widget auth data using HMAC-SHA256.
 * As specified in Telegram Login Widget docs:
 * 1. Secret = SHA256(bot_token)
 * 2. Data check string = key=value pairs sorted alphabetically, joined with '\n' (excluding 'hash')
 * 3. HMAC-SHA256(data_check_string, secret) == hash
 */
export function verifyTelegramAuth(data: TelegramAuthData, botToken?: string): boolean {
  const token = botToken || process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error('[auth] TELEGRAM_BOT_TOKEN is missing');
    return false;
  }

  const { hash, ...rest } = data;
  if (!hash) return false;

  // Check auth date is within 24 hours
  const authTimestamp = Number(rest.auth_date);
  const now = Math.floor(Date.now() / 1000);
  if (isNaN(authTimestamp) || now - authTimestamp > 86400) {
    console.warn('[auth] Telegram auth data expired');
    return false;
  }

  // Build sorted data check string
  const checkArr: string[] = [];
  const keys = Object.keys(rest).sort();
  for (const k of keys) {
    const val = (rest as any)[k];
    if (val !== undefined && val !== null && val !== '') {
      checkArr.push(`${k}=${val}`);
    }
  }
  const checkString = checkArr.join('\n');

  // SHA256 of bot token is the HMAC key
  const secretKey = crypto.createHash('sha256').update(token).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex');

  return calculatedHash.toLowerCase() === hash.toLowerCase();
}

/**
 * Creates and sets a secure HttpOnly JWT session cookie.
 */
export async function createSessionCookie(user: Partial<User>): Promise<string> {
  const token = await new SignJWT({
    id: user.id,
    telegramUserId: user.telegramUserId,
    username: user.username,
    displayName: user.displayName,
    photoUrl: user.photoUrl,
    role: user.role || 'user',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(JWT_SECRET);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  return token;
}

/**
 * Reads and verifies the current session from HttpOnly cookies.
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      id: payload.id as string,
      telegramUserId: payload.telegramUserId as string,
      username: (payload.username as string) || null,
      displayName: (payload.displayName as string) || 'Anonymous Scribe',
      photoUrl: (payload.photoUrl as string) || null,
      role: (payload.role as 'user' | 'admin' | 'moderator') || 'user',
      createdAt: '',
      lastLoginAt: '',
    };
  } catch {
    return null;
  }
}

/**
 * Clears the session cookie.
 */
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
