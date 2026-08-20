interface PendingToken {
  token: string;
  createdAt: number;
  status: 'pending' | 'authorized' | 'rejected';
  user?: {
    id: string;
    telegramUserId: string;
    username: string | null;
    displayName: string;
    photoUrl: string | null;
    role: 'user' | 'admin' | 'moderator';
  };
}

// Global token store
const globalTokens = new Map<string, PendingToken>();

// Cleanup expired tokens older than 10 minutes
function cleanOldTokens() {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const [token, data] of globalTokens.entries()) {
    if (data.createdAt < cutoff) {
      globalTokens.delete(token);
    }
  }
}

export function createPendingToken(token: string): PendingToken {
  cleanOldTokens();
  const entry: PendingToken = {
    token,
    createdAt: Date.now(),
    status: 'pending',
  };
  globalTokens.set(token, entry);
  return entry;
}

export function getPendingToken(token: string): PendingToken | undefined {
  return globalTokens.get(token);
}

export function authorizePendingToken(token: string, user: PendingToken['user']): boolean {
  const entry = globalTokens.get(token);
  if (!entry) return false;

  entry.status = 'authorized';
  entry.user = user;
  return true;
}

export function consumeToken(token: string): PendingToken | undefined {
  const entry = globalTokens.get(token);
  if (entry && entry.status === 'authorized') {
    globalTokens.delete(token);
  }
  return entry;
}
