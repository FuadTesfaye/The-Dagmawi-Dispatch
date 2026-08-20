import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';
import path from 'path';

// Automatically load .env.local from parent directory when running inside web/
if (!process.env.DATABASE_URL && !process.env.DB_URL_1) {
  dotenv.config({ path: path.resolve(process.cwd(), '../.env.local') });
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
}

function getDatabaseUrls(): { primary: string; readPool: string[] } {
  const primary = process.env.DATABASE_URL || process.env.DB_URL_1 || process.env.DB_URL_2;
  if (!primary) {
    throw new Error('DATABASE_URL or DB_URL_1 must be set in .env.local or environment variables');
  }

  const readPool: string[] = [];
  if (process.env.DATABASE_URL) readPool.push(process.env.DATABASE_URL);
  if (process.env.DB_URL_2) readPool.push(process.env.DB_URL_2);
  if (process.env.DB_URL_1) readPool.push(process.env.DB_URL_1);

  const uniquePool = [...new Set(readPool.length > 0 ? readPool : [primary])];
  return { primary, readPool: uniquePool };
}

const maxConnections = Number(process.env.DB_POOL_MAX) || 5;

// Lazy client caches
let writeClient: ReturnType<typeof postgres> | null = null;
let writeDbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;
const readClients: ReturnType<typeof postgres>[] = [];
const readDbInstances: ReturnType<typeof drizzle<typeof schema>>[] = [];
let readIndex = 0;

function getWriteDb() {
  if (!writeDbInstance) {
    const { primary } = getDatabaseUrls();
    writeClient = postgres(primary, { max: maxConnections, idle_timeout: 20 });
    writeDbInstance = drizzle(writeClient, { schema });
  }
  return writeDbInstance;
}

function initReadDbs() {
  if (readDbInstances.length === 0) {
    const { readPool } = getDatabaseUrls();
    for (const url of readPool) {
      const client = postgres(url, { max: maxConnections, idle_timeout: 20 });
      readClients.push(client);
      readDbInstances.push(drizzle(client, { schema }));
    }
  }
  return readDbInstances;
}

export const writeDb = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    return (getWriteDb() as any)[prop];
  },
});

export function getReadDb() {
  const dbs = initReadDbs();
  const db = dbs[readIndex % dbs.length];
  readIndex++;
  return db;
}

export async function withReadDb<T>(
  fn: (db: ReturnType<typeof drizzle<typeof schema>>) => Promise<T>,
): Promise<T> {
  const dbs = initReadDbs();
  const startIndex = readIndex % dbs.length;
  readIndex++;

  let lastError: unknown;
  for (let i = 0; i < dbs.length; i++) {
    const candidate = dbs[(startIndex + i) % dbs.length];
    try {
      return await fn(candidate);
    } catch (err) {
      lastError = err;
      console.warn(`[web/db] Read replica query failed, trying next replica...`, err);
    }
  }

  // Fallback to write primary if all replicas fail
  try {
    return await fn(getWriteDb());
  } catch {
    throw lastError;
  }
}
