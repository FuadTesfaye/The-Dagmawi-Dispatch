import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';

const API_ID = Number(process.env.TELEGRAM_API_ID || '36049913');
const API_HASH = process.env.TELEGRAM_API_HASH || 'e74c1ddae57214cc7f66dfa54395eefb';

interface PhoneSession {
  sessionId: string;
  phone: string;
  phoneCodeHash: string;
  sessionString: string;
  client?: TelegramClient;
  createdAt: number;
}

// In-memory store for pending phone logins (expires after 10 mins)
const pendingSessions = new Map<string, PhoneSession>();

function cleanOldSessions() {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [id, s] of pendingSessions.entries()) {
    if (s.createdAt < cutoff) {
      if (s.client) {
        s.client.disconnect().catch(() => {});
      }
      pendingSessions.delete(id);
    }
  }
}

/** Normalize input to international E.164 phone format */
export function normalizePhoneNumber(rawPhone: string): string {
  let cleaned = rawPhone.replace(/[\s\-\(\)]/g, '');
  if (cleaned.startsWith('09') || cleaned.startsWith('07')) {
    cleaned = '+251' + cleaned.slice(1);
  } else if (cleaned.startsWith('9') && cleaned.length === 9) {
    cleaned = '+251' + cleaned;
  } else if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  return cleaned;
}

/** Send Telegram verification code to user's Telegram app */
export async function sendTelegramPhoneCode(rawPhone: string): Promise<{
  sessionId: string;
  normalizedPhone: string;
  phoneCodeHash: string;
  isCodeViaApp: boolean;
}> {
  cleanOldSessions();
  const normalizedPhone = normalizePhoneNumber(rawPhone);

  const stringSession = new StringSession('');
  const client = new TelegramClient(stringSession, API_ID, API_HASH, {
    connectionRetries: 5,
  });

  await client.connect();

  try {
    const result = await client.sendCode(
      {
        apiId: API_ID,
        apiHash: API_HASH,
      },
      normalizedPhone
    );

    const sessionId = `phone_${Math.random().toString(36).slice(2, 12)}_${Date.now()}`;
    const savedSessionString = client.session.save() as unknown as string;

    pendingSessions.set(sessionId, {
      sessionId,
      phone: normalizedPhone,
      phoneCodeHash: result.phoneCodeHash,
      sessionString: savedSessionString,
      client,
      createdAt: Date.now(),
    });

    return {
      sessionId,
      normalizedPhone,
      phoneCodeHash: result.phoneCodeHash,
      isCodeViaApp: result.isCodeViaApp ?? true,
    };
  } catch (err) {
    await client.disconnect().catch(() => {});
    throw err;
  }
}

/** Verify code and sign in */
export async function verifyTelegramPhoneCode(
  sessionId: string,
  code: string,
  password?: string
): Promise<{
  id: string;
  username: string | null;
  displayName: string;
  photoUrl: string | null;
}> {
  cleanOldSessions();
  const entry = pendingSessions.get(sessionId);
  if (!entry) {
    throw new Error('Verification session expired or invalid. Please request a new code.');
  }

  let client = entry.client;
  if (!client || !client.connected) {
    const stringSession = new StringSession(entry.sessionString);
    client = new TelegramClient(stringSession, API_ID, API_HASH, {
      connectionRetries: 5,
    });
    await client.connect();
  }

  try {
    let user: any;
    try {
      user = await client.signInUser(
        {
          apiId: API_ID,
          apiHash: API_HASH,
        },
        {
          phoneNumber: async () => entry.phone,
          phoneCode: async () => code.trim(),
          password: async () => password || '',
          onError: (err) => {
            throw err;
          },
        }
      );
    } catch (err: any) {
      if (err.message && err.message.includes('SESSION_PASSWORD_NEEDED')) {
        if (!password) {
          throw new Error('2FA_REQUIRED');
        }
        // Retry with 2FA password
        user = await (client as any).signInWithPassword({
          password,
        });
      } else {
        throw err;
      }
    }

    // Successfully signed in!
    pendingSessions.delete(sessionId);

    const telegramId = String(user.id || user.userId);
    const username = user.username || null;
    const displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || username || `Telegram Scribe #${telegramId}`;
    const photoUrl = username ? `https://api.dicebear.com/7.x/bottts/svg?seed=${username}` : null;

    return {
      id: telegramId,
      username,
      displayName,
      photoUrl,
    };
  } finally {
    await client.disconnect().catch(() => {});
  }
}
