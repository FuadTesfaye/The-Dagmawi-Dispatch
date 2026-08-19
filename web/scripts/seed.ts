import postgres from 'postgres';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load root or local .env
const envLocalPath = path.resolve(process.cwd(), '../.env.local');
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const dbUrl = process.env.DB_URL_1 || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL or DB_URL_1 is missing');
  process.exit(1);
}

const sql = postgres(dbUrl, { prepare: false, connect_timeout: 15 });

async function initSchema() {
  console.log('📦 Initializing Web Platform Database Schema...');

  await sql.unsafe(`
    -- Extension for UUID generation
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    -- Users Table
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      telegram_user_id VARCHAR(100) UNIQUE NOT NULL,
      username VARCHAR(100),
      display_name VARCHAR(200) NOT NULL,
      photo_url TEXT,
      role VARCHAR(20) NOT NULL DEFAULT 'user',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Tracked Channels Table
    CREATE TABLE IF NOT EXISTS tracked_channels (
      id VARCHAR(100) PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      description TEXT,
      avatar_url TEXT,
      subscriber_count INTEGER DEFAULT 0 NOT NULL,
      is_verified BOOLEAN DEFAULT false NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Subscriptions Table
    CREATE TABLE IF NOT EXISTS subscriptions (
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      channel_id VARCHAR(100) REFERENCES tracked_channels(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, channel_id)
    );

    -- Posts Table (compatible with existing table if already present)
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
      views_count INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (channel, id)
    );

    -- Comments Table
    CREATE TABLE IF NOT EXISTS comments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      channel VARCHAR(100) NOT NULL,
      post_id INTEGER NOT NULL,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      parent_id UUID,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Post Reactions Table
    CREATE TABLE IF NOT EXISTS post_reactions (
      channel VARCHAR(100) NOT NULL,
      post_id INTEGER NOT NULL,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      emoji VARCHAR(20) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (channel, post_id, user_id, emoji)
    );

    -- AI Reviews Table
    CREATE TABLE IF NOT EXISTS ai_reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      channel VARCHAR(100) NOT NULL,
      post_id INTEGER NOT NULL,
      kind VARCHAR(50) NOT NULL,
      content TEXT NOT NULL,
      model_used VARCHAR(100),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Moderation Reports Table
    CREATE TABLE IF NOT EXISTS moderation_reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      target_type VARCHAR(20) NOT NULL,
      channel VARCHAR(100) NOT NULL,
      post_id INTEGER,
      comment_id UUID,
      reason VARCHAR(100) NOT NULL,
      details TEXT,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Indexes for high performance queries
    CREATE INDEX IF NOT EXISTS idx_posts_channel_date ON posts (channel, date DESC);
    CREATE INDEX IF NOT EXISTS idx_posts_local_date ON posts (local_date DESC);
    CREATE INDEX IF NOT EXISTS idx_comments_post ON comments (channel, post_id, created_at ASC);
    CREATE INDEX IF NOT EXISTS idx_post_reactions_post ON post_reactions (channel, post_id);
    CREATE INDEX IF NOT EXISTS idx_ai_reviews_post ON ai_reviews (channel, post_id);
    CREATE INDEX IF NOT EXISTS idx_moderation_reports_status ON moderation_reports (status);
  `);

  console.log('✅ Tables and indexes initialized successfully.');
}

async function seedInitialData() {
  console.log('🌱 Seeding initial channels and demo users...');

  // Default Tracked Channels
  const defaultChannels = [
    {
      id: 'dagmawi_babi',
      name: 'Dagmawi Babi (ዳግማዊ ባቢ)',
      description: 'The royal decree of daily tech rants, unfiltered opinions, and high-frequency Telegram dispatches.',
      avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=dagmawi_babi',
      subscriber_count: 1420,
      is_verified: true,
    },
    {
      id: 'tikvahethiopia',
      name: 'Tikvah Ethiopia',
      description: 'Breaking news, national updates, and verified reports across Ethiopia.',
      avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=tikvahethiopia',
      subscriber_count: 8500,
      is_verified: true,
    },
    {
      id: 'tech_ethio',
      name: 'Tech Ethiopia Dispatch',
      description: 'Ethiopian tech ecosystem, developer tools, AI innovations, and startups.',
      avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=tech_ethio',
      subscriber_count: 620,
      is_verified: false,
    }
  ];

  for (const ch of defaultChannels) {
    await sql`
      INSERT INTO tracked_channels (id, name, description, avatar_url, subscriber_count, is_verified)
      VALUES (${ch.id}, ${ch.name}, ${ch.description}, ${ch.avatar_url}, ${ch.subscriber_count}, ${ch.is_verified})
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        avatar_url = EXCLUDED.avatar_url,
        subscriber_count = EXCLUDED.subscriber_count,
        is_verified = EXCLUDED.is_verified
    `;
  }

  // Demo User (for instant developer / local preview)
  const demoUserId = '00000000-0000-0000-0000-000000000001';
  await sql`
    INSERT INTO users (id, telegram_user_id, username, display_name, photo_url, role)
    VALUES (${demoUserId}, '999999999', 'royal_herald', 'Royal Herald (Demo Admin)', 'https://api.dicebear.com/7.x/avataaars/svg?seed=herald', 'admin')
    ON CONFLICT (telegram_user_id) DO UPDATE SET
      username = EXCLUDED.username,
      display_name = EXCLUDED.display_name,
      role = EXCLUDED.role
  `;

  // Subscribe Demo User to default channels
  for (const ch of defaultChannels) {
    await sql`
      INSERT INTO subscriptions (user_id, channel_id)
      VALUES (${demoUserId}, ${ch.id})
      ON CONFLICT DO NOTHING
    `;
  }

  console.log('✅ Default channels and demo admin created.');
}

async function main() {
  try {
    await initSchema();
    await seedInitialData();
    console.log('🎉 Web platform database setup complete!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
