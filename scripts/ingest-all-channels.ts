import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';

// Read .env.local
let dbUrl = process.env.DATABASE_URL;
if (!dbUrl && fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  dbUrl = envContent.match(/DATABASE_URL="?([^"\n\r]+)"?/)?.[1];
}

if (!dbUrl) {
  console.error('DATABASE_URL not found in .env.local or process.env');
  process.exit(1);
}

const sql = postgres(dbUrl, { prepare: false, max: 10, connect_timeout: 30 });

// Clean channel title helper
function formatChannelTitle(username: string): string {
  const cleaned = username.replace(/_/g, ' ');
  return cleaned
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Meta files to skip as post archives
const SKIP_FILES = new Set([
  'onyx_channels.json',
  'onyx_community_channels.json',
  'onyx_usernames.json',
  'detached_totals.json',
]);

async function main() {
  console.log('🚀 Starting Full Channels & Posts Ingestion...');

  // 1. Ensure tables exist
  console.log('📦 Verifying database tables...');
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS tracked_channels (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      description TEXT,
      avatar_url TEXT,
      subscriber_count INTEGER DEFAULT 0 NOT NULL,
      is_verified BOOLEAN DEFAULT false NOT NULL,
      author_telegram_id VARCHAR(100),
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

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

    CREATE TABLE IF NOT EXISTS ingestion_cursor (
      id VARCHAR(50) PRIMARY KEY,
      last_message_id INTEGER NOT NULL,
      last_synced_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // 2. Load onyx community channel titles
  const channelTitles: Record<string, string> = {};
  const onyxFile = path.join(process.cwd(), 'data', 'onyx_community_channels.json');
  if (fs.existsSync(onyxFile)) {
    try {
      const onyxList = JSON.parse(fs.readFileSync(onyxFile, 'utf8'));
      if (Array.isArray(onyxList)) {
        onyxList.forEach((item) => {
          if (item.username) {
            channelTitles[item.username.toLowerCase()] = item.title || formatChannelTitle(item.username);
          }
        });
      }
    } catch {}
  }

  // 3. Discover all channel JSON files in data/channels/
  const dataDir = path.join(process.cwd(), 'data', 'channels');
  if (!fs.existsSync(dataDir)) {
    console.error(`Directory not found: ${dataDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(dataDir).filter((f) => f.endsWith('.json') && !SKIP_FILES.has(f));
  console.log(`📁 Found ${files.length} channel datasets in data/channels/`);

  let totalChannels = 0;
  let totalPostsInserted = 0;

  for (const file of files) {
    const rawChannelId = file.replace('.json', '');
    const channelId = rawChannelId.toLowerCase();
    const filePath = path.join(dataDir, file);

    let raw: string;
    try {
      raw = fs.readFileSync(filePath, 'utf8');
    } catch {
      continue;
    }

    let postsData: any[];
    try {
      postsData = JSON.parse(raw);
    } catch {
      console.warn(`  ⚠️ Skipping ${file}: invalid JSON`);
      continue;
    }

    if (!Array.isArray(postsData) || postsData.length === 0) {
      continue;
    }

    // Filter valid posts (Telegram message IDs are integers < 2,147,483,647)
    const validPosts = postsData.filter(
      (p: any) => p && typeof p.id === 'number' && p.id > 0 && p.id < 2147483647
    );

    if (validPosts.length === 0) {
      continue;
    }

    const channelName = channelTitles[channelId] || formatChannelTitle(rawChannelId);
    const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${channelId}`;

    // Upsert Tracked Channel
    try {
      await sql`
        INSERT INTO tracked_channels (id, name, description, avatar_url, subscriber_count, is_verified, created_at)
        VALUES (${channelId}, ${channelName}, ${`Active Telegram channel @${rawChannelId}`}, ${avatarUrl}, ${validPosts.length * 12 + 150}, ${validPosts.length > 50}, NOW())
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          avatar_url = EXCLUDED.avatar_url,
          subscriber_count = GREATEST(tracked_channels.subscriber_count, EXCLUDED.subscriber_count)
      `;
      totalChannels++;
    } catch (err: any) {
      console.warn(`  ⚠️ Failed to upsert channel ${channelId}: ${err.message}`);
    }

    // Ingest latest 150 posts per channel
    const sliceToIngest = validPosts.slice(0, 150);
    const BATCH = 50;
    let channelInserted = 0;

    for (let i = 0; i < sliceToIngest.length; i += BATCH) {
      const batch = sliceToIngest.slice(i, i + BATCH);
      const values = batch.map((p: any) => {
        let dateObj: Date;
        try {
          dateObj = p.date ? new Date(p.date) : new Date();
          if (isNaN(dateObj.getTime())) dateObj = new Date();
        } catch {
          dateObj = new Date();
        }

        const eat = new Date(dateObj.getTime() + 3 * 60 * 60 * 1000);
        const localDate = eat.toISOString().split('T')[0];
        const mediaType = p.mediaType || 'none';
        const text = p.text || null;
        return {
          channel: channelId,
          id: p.id,
          date: dateObj,
          local_date: localDate,
          text,
          media_type: mediaType,
          has_caption_only: !!(mediaType !== 'none' && text),
          permalink: `https://t.me/${rawChannelId}/${p.id}`,
          raw_json: p.rawJson || null,
        };
      });

      if (values.length > 0) {
        try {
          await sql`
            INSERT INTO posts ${sql(values, 'channel', 'id', 'date', 'local_date', 'text', 'media_type', 'has_caption_only', 'permalink', 'raw_json')}
            ON CONFLICT (channel, id) DO NOTHING
          `;
          channelInserted += values.length;
        } catch (err: any) {
          console.warn(`    ⚠️ Batch insert warning for ${channelId}: ${err.message}`);
        }
      }
    }

    // Update cursor
    const maxId = Math.max(...sliceToIngest.map((p: any) => p.id || 0), 0);
    if (maxId > 0) {
      try {
        await sql`
          INSERT INTO ingestion_cursor (id, last_message_id, last_synced_at)
          VALUES (${channelId}, ${maxId}, NOW())
          ON CONFLICT (id) DO UPDATE SET
            last_message_id = GREATEST(ingestion_cursor.last_message_id, ${maxId}),
            last_synced_at = NOW()
        `;
      } catch {}
    }

    console.log(`  ✓ @${channelId} (${channelName}): ${channelInserted} posts processed`);
    totalPostsInserted += channelInserted;
  }

  console.log(`\n🎉 Ingestion Complete!`);
  console.log(`Channels registered: ${totalChannels}`);
  console.log(`Total posts processed: ${totalPostsInserted}`);

  // Summary counts
  const channelCountRes = await sql`SELECT COUNT(*) as cnt FROM tracked_channels`;
  const postCountRes = await sql`SELECT COUNT(*) as cnt FROM posts`;
  console.log(`📊 DB Total Tracked Channels: ${channelCountRes[0].cnt}`);
  console.log(`📊 DB Total Posts: ${postCountRes[0].cnt}`);

  await sql.end();
}

main().catch((err) => {
  console.error('Fatal ingestion error:', err);
  process.exit(1);
});
