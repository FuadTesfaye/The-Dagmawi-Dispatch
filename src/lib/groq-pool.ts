import Groq from "groq-sdk";
import type { ChatCompletionCreateParamsNonStreaming } from "groq-sdk/resources/chat/completions";
import { aiPool } from "./concurrency-pool";

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

function countHealthyKeys(states: KeyState[], now: number): number {
  return states.filter((s) => isKeyHealthy(s, now)).length;
}

/** Round-robin through all keys, skipping cooled-down entries. */
function pickKeyIndex(states: KeyState[]): number | null {
  const now = Date.now();
  const n = states.length;

  for (let offset = 0; offset < n; offset++) {
    const index = (roundRobinIndex + offset) % n;
    if (isKeyHealthy(states[index], now)) {
      roundRobinIndex = (index + 1) % n;
      return index;
    }
  }

  return null;
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

function parseRetryAfterMs(err: unknown): number | undefined {
  if (!err || typeof err !== "object") return undefined;
  const headers = (err as { headers?: Record<string, string> }).headers;
  if (!headers) return undefined;

  const retryAfter =
    headers["retry-after"] ??
    headers["Retry-After"] ??
    headers["x-ratelimit-reset-requests"];

  if (!retryAfter) return undefined;

  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.ceil(seconds * 1000);
  }

  const resetAt = Date.parse(retryAfter);
  if (Number.isFinite(resetAt)) {
    const delta = resetAt - Date.now();
    return delta > 0 ? delta : undefined;
  }

  return undefined;
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
  const healthy = countHealthyKeys(states, now);
  return {
    totalKeys: states.length,
    healthyKeys: healthy,
    cooledDownKeys: states.length - healthy,
    roundRobinIndex,
    keyUsage: [...keyUsageCounts],
  };
}

async function createGroqCompletionOnce(
  params: ChatCompletionCreateParamsNonStreaming,
): Promise<Groq.Chat.Completions.ChatCompletion> {
  const states = getKeyStates();
  const defaultAttempts = states.length;
  const maxAttempts = Math.min(
    envInt("GROQ_MAX_RETRIES", defaultAttempts),
    states.length,
  );
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const keyIndex = pickKeyIndex(states);
    if (keyIndex === null) break;

    recordKeyUse(keyIndex);

    try {
      return await states[keyIndex].client.chat.completions.create(params);
    } catch (err) {
      lastError = err;
      if (isRateLimitError(err)) {
        markRateLimited(keyIndex, parseRetryAfterMs(err));
        continue;
      }
      if (isAuthError(err)) {
        markRateLimited(keyIndex, AUTH_COOLDOWN_MS);
        continue;
      }
      throw err;
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new Error("All Groq API keys are rate-limited or unavailable.");
}

/** Groq chat completion with key rotation, cooldown failover, and AI concurrency cap. */
export async function createGroqCompletion(
  params: ChatCompletionCreateParamsNonStreaming,
): Promise<Groq.Chat.Completions.ChatCompletion> {
  return aiPool.run(() => createGroqCompletionOnce(params));
}
