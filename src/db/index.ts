import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { users } from '../../drizzle/schema'

// Initialize all 3 Supabase Database connections
const dbUrls = [
  process.env.DB_URL_1,
  process.env.DB_URL_2,
  process.env.DB_URL_3,
].filter(Boolean) as string[];

// Create connection pools for each database
const clients = dbUrls.map(url => postgres(url, { prepare: false }));
const dbs = clients.map(client => drizzle(client));

/**
 * Returns a database instance using Round-Robin load balancing.
 * Since these are independent Supabase instances, use this carefully 
 * (e.g., for read replicas or sharded data).
 */
let currentIndex = 0;
export const getDb = () => {
  if (dbs.length === 0) throw new Error("No database URLs configured.");
  const db = dbs[currentIndex];
  currentIndex = (currentIndex + 1) % dbs.length;
  return db;
};

// Default export uses the primary DB (first one) or the round-robin selector
export const db = dbs[0];

// The primary DB is also where the Search Engine graph data lives
export const searchDb = dbs[0];

// Example export to be used in server actions or API routes
// export const allUsers = await db.select().from(users);
