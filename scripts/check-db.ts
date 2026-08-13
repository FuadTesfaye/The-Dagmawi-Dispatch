import postgres from 'postgres';
import * as fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf8');
const dbUrl = envContent.match(/DATABASE_URL="([^"]+)"/)?.[1];

const sql = postgres(dbUrl!, { prepare: false, connect_timeout: 10 });

async function main() {
  try {
    const r = await sql`SELECT COUNT(*) as cnt FROM posts`;
    console.log('posts count:', r[0].cnt);

    const ch = await sql`SELECT DISTINCT channel FROM posts LIMIT 30`;
    console.log('channels in DB:', ch.map((x: any) => x.channel));

    const ds = await sql`SELECT DISTINCT local_date FROM posts ORDER BY local_date DESC LIMIT 5`;
    console.log('recent dates:', ds.map((x: any) => x.local_date));

    const tables = await sql`SELECT tablename FROM pg_tables WHERE schemaname='public'`;
    console.log('tables:', tables.map((x: any) => x.tablename));
  } catch (e: any) {
    console.error('DB error:', e.message);
  } finally {
    await sql.end();
  }
}

main();
