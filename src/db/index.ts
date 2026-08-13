import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const poolConfig = {
  prepare: false as const,
  max: Number(process.env.DB_POOL_MAX ?? 10),
  idle_timeout: 20,
  connect_timeout: 10,
  max_lifetime: 60 * 30,
};

const botDbUrls = [
  process.env.DB_URL_1,
  process.env.DB_URL_2,
  process.env.DB_URL_3,
].filter(Boolean) as string[];

const uniqueBotUrls = [...new Set(botDbUrls.length > 0 ? botDbUrls : [process.env.DATABASE_URL].filter(Boolean) as string[])];

if (uniqueBotUrls.length === 0) {
  throw new Error("No database URLs configured (DB_URL_1, DB_URL_2, DB_URL_3, or DATABASE_URL).");
}

const clients = uniqueBotUrls.map((url) => postgres(url, poolConfig));
const dbs = clients.map((client) => drizzle(client));

export type AppDb = PostgresJsDatabase<Record<string, never>>;

/** Primary database — all writes go here. */
export const writeDb: AppDb = dbs[0];

/** @deprecated Prefer readDb() for selects and writeDb for mutations. */
export const db = writeDb;

let readIndex = 0;

/**
 * Round-robin read pool across configured bot database URLs.
 * Falls back to primary when only one URL is configured.
 */
export function readDb(): AppDb {
  if (dbs.length === 1) return dbs[0];
  const instance = dbs[readIndex];
  readIndex = (readIndex + 1) % dbs.length;
  return instance;
}

/** Run a read query with automatic fallback to primary on failure. */
export async function withReadDb<T>(fn: (db: AppDb) => Promise<T>): Promise<T> {
  if (dbs.length === 1) return fn(dbs[0]);

  const start = readIndex;
  let lastError: unknown;

  for (let i = 0; i < dbs.length; i++) {
    const instance = dbs[(start + i) % dbs.length];
    try {
      return await fn(instance);
    } catch (err) {
      lastError = err;
      console.warn("readDb fallback:", err instanceof Error ? err.message : err);
    }
  }

  return fn(writeDb);
}

/** @deprecated Use readDb() instead. */
export const getDb = readDb;

const searchUrl = process.env.DATABASE_URL || process.env.DB_URL_1 || uniqueBotUrls[0];
const searchDbClient = postgres(searchUrl, poolConfig);
export const searchDb = drizzle(searchDbClient);

export const dbPoolStats = () => ({
  pools: uniqueBotUrls.length,
  maxPerPool: poolConfig.max,
});
