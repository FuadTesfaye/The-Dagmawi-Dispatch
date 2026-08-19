import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

function getDatabaseUrls(): { primary: string; readPool: string[] } {
  const primary = process.env.DB_URL_1 || process.env.DATABASE_URL;
  if (!primary) {
    throw new Error('DATABASE_URL or DB_URL_1 must be set');
  }

  const readPool: string[] = [];
  if (process.env.DB_URL_1) readPool.push(process.env.DB_URL_1);
  if (process.env.DB_URL_2) readPool.push(process.env.DB_URL_2);
  if (process.env.DB_URL_3) readPool.push(process.env.DB_URL_3);

  if (readPool.length === 0) {
    readPool.push(primary);
  }

  return { primary, readPool };
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
