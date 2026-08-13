import Groq from "groq-sdk";
import type { ChatCompletionCreateParamsNonStreaming } from "groq-sdk/resources/chat/completions";

const AUTH_COOLDOWN_MS = 5 * 60 * 1000;

interface KeyState {
  key: string;
  client: Groq;
  rateLimitedUntil: number;
}

let keyStates: KeyState[] | null = null;
let roundRobinIndex = 0;
const keyUsageCounts: number[] = [];

function envInt(key: string, fallback: number): number {
  const n = Number(process.env[key]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function loadGroqKeys(): string[] {
  const keys: string[] = [];

  if (process.env.GROQ_API_KEY?.trim()) {
    keys.push(process.env.GROQ_API_KEY.trim());
  }

  for (let i = 1; i <= 9; i++) {
    const value = process.env[`GROQ_API_KEY_${i}`]?.trim();
    if (value) keys.push(value);
  }

  return [...new Set(keys)];
}

function getKeyStates(): KeyState[] {
  if (!keyStates) {
    const keys = loadGroqKeys();
    if (keys.length === 0) {
      throw new Error("No Groq API keys configured (GROQ_API_KEY or GROQ_API_KEY_1..9).");
    }
    keyStates = keys.map((key) => ({
      key,
      client: new Groq({ apiKey: key }),
      rateLimitedUntil: 0,
    }));
    keyUsageCounts.length = keys.length;
    keyUsageCounts.fill(0);
  }
  return keyStates;
}

function recordKeyUse(keyIndex: number): void {
  keyUsageCounts[keyIndex] = (keyUsageCounts[keyIndex] ?? 0) + 1;
}

function isKeyHealthy(state: KeyState, now: number): boolean {
  return state.rateLimitedUntil <= now;
}

function pickKeyIndex(states: KeyState[], now: number): number | null {
  const healthy = states
    .map((_, index) => index)
    .filter((index) => isKeyHealthy(states[index], now));

  if (healthy.length === 0) return null;

  const start = roundRobinIndex % healthy.length;
  roundRobinIndex = (roundRobinIndex + 1) % healthy.length;
  return healthy[start];
}

export function isRateLimitError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { status?: number; code?: string; message?: string };
  if (e.status === 429) return true;
  const msg = (e.message ?? "").toLowerCase();
  return msg.includes("rate limit") || msg.includes("rate_limit") || e.code === "rate_limit_exceeded";
}

function isAuthError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { status?: number; message?: string };
  return e.status === 401 || e.status === 403;
}

export function markRateLimited(keyIndex: number, cooldownMs?: number): void {
  const states = getKeyStates();
  if (keyIndex < 0 || keyIndex >= states.length) return;
  const ms = cooldownMs ?? envInt("GROQ_KEY_COOLDOWN_MS", 60_000);
  states[keyIndex].rateLimitedUntil = Date.now() + ms;
}

/** Test helper: mark a key as rate-limited without making an API call. */
export function markKeyRateLimitedForTest(keyIndex: number, cooldownMs?: number): void {
  markRateLimited(keyIndex, cooldownMs);
}

/** How many times each key index was selected (for rotation tests). */
export function groqKeyUsageStats(): number[] {
  getKeyStates();
  return [...keyUsageCounts];
}

/** Reset pool state between test runs. */
export function resetGroqPoolForTest(): void {
  keyStates = null;
  roundRobinIndex = 0;
  keyUsageCounts.length = 0;
}

export function groqPoolStats() {
  const states = getKeyStates();
  const now = Date.now();
  const healthy = states.filter((s) => isKeyHealthy(s, now)).length;
  return {
    totalKeys: states.length,
    healthyKeys: healthy,
    cooledDownKeys: states.length - healthy,
    roundRobinIndex,
  };
}

export async function createGroqCompletion(
  params: ChatCompletionCreateParamsNonStreaming,
): Promise<Groq.Chat.Completions.ChatCompletion> {
  const states = getKeyStates();
  const maxRetries = Math.min(envInt("GROQ_MAX_RETRIES", states.length), states.length);
  const now = Date.now();
  let lastError: unknown;

  const tried = new Set<number>();

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const keyIndex = pickKeyIndex(states, now);
    if (keyIndex === null) {
      break;
    }
    if (tried.has(keyIndex) && tried.size >= states.filter((s) => isKeyHealthy(s, now)).length) {
      break;
    }
    tried.add(keyIndex);
    recordKeyUse(keyIndex);

    try {
      return await states[keyIndex].client.chat.completions.create(params);
    } catch (err) {
      lastError = err;
      if (isRateLimitError(err)) {
        markRateLimited(keyIndex);
        console.warn(`Groq key #${keyIndex} rate-limited, trying next key`);
        continue;
      }
      if (isAuthError(err)) {
        markRateLimited(keyIndex, AUTH_COOLDOWN_MS);
        console.warn(`Groq key #${keyIndex} auth error, trying next key`);
        continue;
      }
      throw err;
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new Error("All Groq API keys are rate-limited or unavailable.");
}
