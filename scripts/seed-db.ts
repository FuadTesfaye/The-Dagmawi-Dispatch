import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';

const envContent = fs.readFileSync('.env.local', 'utf8');
const dbUrl = envContent.match(/DATABASE_URL="([^"]+)"/)?.[1]!;
const sql = postgres(dbUrl, { prepare: false, connect_timeout: 15 });

async function createTables() {
  console.log('Creating tables...');
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS posts (
      channel VARCHAR(100) NOT NULL DEFAULT 'dagmawi_babi',
      id INTEGER NOT NULL,
      date TIMESTAMPTZ NOT NULL,
      local_date DATE NOT NULL,
      text TEXT,
      media_type VARCHAR(50) NOT NULL DEFAULT 'none',
      has_caption_only BOOLEAN DEFAULT false,
      permalink TEXT,
      raw_json JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (channel, id)
    );

    CREATE TABLE IF NOT EXISTS daily_summaries (
      id TEXT PRIMARY KEY,
      channel VARCHAR(100) NOT NULL DEFAULT 'dagmawi_babi',
      local_date DATE NOT NULL,
      summary_text TEXT NOT NULL,
      post_count INTEGER NOT NULL,
      language VARCHAR(10) NOT NULL DEFAULT 'am',
      model_used VARCHAR(100),
      generated_at TIMESTAMPTZ DEFAULT NOW(),
      is_final BOOLEAN DEFAULT false
    );

    CREATE TABLE IF NOT EXISTS subscribers (
      telegram_user_id VARCHAR(100) PRIMARY KEY,
      chat_id VARCHAR(100) NOT NULL,
      subscribed_at TIMESTAMPTZ DEFAULT NOW(),
      preferred_language VARCHAR(10) DEFAULT 'am',
      active BOOLEAN DEFAULT true
    );

    CREATE TABLE IF NOT EXISTS ingestion_cursor (
      id VARCHAR(50) PRIMARY KEY,
      last_message_id INTEGER NOT NULL,
      last_synced_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS guesses (
      id TEXT PRIMARY KEY,
      channel VARCHAR(100) NOT NULL DEFAULT 'dagmawi_babi',
      local_date DATE NOT NULL,
      telegram_user_id VARCHAR(100) NOT NULL,
      display_name VARCHAR(200) NOT NULL,
      guess INTEGER NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS user_channels (
      telegram_user_id VARCHAR(100) PRIMARY KEY,
      channel VARCHAR(100) NOT NULL DEFAULT 'dagmawi_babi',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('Tables created.');
}

async function seedChannel(channelName: string, filePath: string) {
  const raw = fs.readFileSync(filePath, 'utf8');
  let posts: any[];
  try {
    posts = JSON.parse(raw);
  } catch {
    console.warn(`  Skipping ${channelName}: invalid JSON`);
    return 0;
  }

  if (!Array.isArray(posts) || posts.length === 0) return 0;

  let inserted = 0;
  const BATCH = 100;

  for (let i = 0; i < posts.length; i += BATCH) {
    const batch = posts.slice(i, i + BATCH);
    const values = batch.map((p: any) => {
      const dateObj = new Date(p.date);
      const eat = new Date(dateObj.getTime() + 3 * 60 * 60 * 1000);
      const localDate = eat.toISOString().split('T')[0];
      const mediaType = p.mediaType || 'none';
      const text = p.text || null;
      return {
        channel: channelName,
        id: p.id,
        date: dateObj,
        local_date: localDate,
        text,
        media_type: mediaType,
        has_caption_only: !!(mediaType !== 'none' && text),
        permalink: `https://t.me/${channelName}/${p.id}`,
        raw_json: p.rawJson || null,
      };
    });

    try {
      await sql`
        INSERT INTO posts ${sql(values, 'channel','id','date','local_date','text','media_type','has_caption_only','permalink','raw_json')}
        ON CONFLICT (channel, id) DO NOTHING
      `;
      inserted += batch.length;
    } catch (e: any) {
      console.warn(`  Batch error for ${channelName}: ${e.message}`);
    }
  }

  // Update ingestion cursor to highest message id
  const maxId = Math.max(...posts.map((p: any) => p.id));
  await sql`
    INSERT INTO ingestion_cursor (id, last_message_id, last_synced_at)
    VALUES (${channelName}, ${maxId}, NOW())
    ON CONFLICT (id) DO UPDATE SET last_message_id = GREATEST(ingestion_cursor.last_message_id, ${maxId}), last_synced_at = NOW()
  `;

  return inserted;
}

async function main() {
  await createTables();

  const dataDir = path.join(process.cwd(), 'data', 'channels');
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));

  console.log(`\nSeeding ${files.length} channel files...`);
  let total = 0;

  for (const file of files) {
    const channelName = file.replace('.json', '');
    const filePath = path.join(dataDir, file);
    const count = await seedChannel(channelName, filePath);
    console.log(`  ${channelName}: ${count} posts`);
    total += count;
  }

  console.log(`\nDone. Total posts inserted: ${total}`);

  // Verify
  const r = await sql`SELECT COUNT(*) as cnt FROM posts`;
  const ch = await sql`SELECT DISTINCT channel FROM posts ORDER BY channel`;
  console.log(`DB posts count: ${r[0].cnt}`);
  console.log(`Channels in DB: ${ch.map((x: any) => x.channel).join(', ')}`);

  await sql.end();
}

main().catch(e => { console.error(e); process.exit(1); });
