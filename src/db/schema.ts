import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  date,
  varchar,
  primaryKey,
  uuid,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  telegramUserId: varchar('telegram_user_id', { length: 100 }).notNull().unique(),
  username: varchar('username', { length: 100 }),
  displayName: varchar('display_name', { length: 200 }).notNull(),
  photoUrl: text('photo_url'),
  role: varchar('role', { length: 20 }).notNull().default('user'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }).defaultNow().notNull(),
});

export const trackedChannels = pgTable('tracked_channels', {
  id: varchar('id', { length: 100 }).primaryKey(), // e.g. 'dagmawi_babi'
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  avatarUrl: text('avatar_url'),
  subscriberCount: integer('subscriber_count').default(0).notNull(),
  isVerified: boolean('is_verified').default(false).notNull(),
  authorTelegramId: varchar('author_telegram_id', { length: 100 }), // for Creator Report Card authentication
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const subscriptions = pgTable('subscriptions', {
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  channelId: varchar('channel_id', { length: 100 }).references(() => trackedChannels.id, { onDelete: 'cascade' }).notNull(),
  isMuted: boolean('is_muted').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.channelId] }),
}));

// ─── 1. CROSS-CHANNEL DAILY DIGEST SUBSCRIPTIONS ──────────────
export const digestSubscriptions = pgTable('digest_subscriptions', {
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  channelId: varchar('channel_id', { length: 100 }).references(() => trackedChannels.id, { onDelete: 'cascade' }).notNull(),
  deliveryTime: varchar('delivery_time', { length: 10 }).default('08:00').notNull(),
  isEnabled: boolean('is_enabled').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.channelId] }),
}));

export const posts = pgTable('posts', {
  channel: varchar('channel', { length: 100 }).notNull().default('dagmawi_babi'),
  id: integer('id').notNull(), // Telegram message ID
  date: timestamp('date', { withTimezone: true }).notNull(),
  localDate: date('local_date').notNull(),
  text: text('text'),
  mediaType: varchar('media_type', { length: 50 }).notNull().default('none'),
  hasCaptionOnly: boolean('has_caption_only').default(false),
  permalink: text('permalink'),
  rawJson: jsonb('raw_json'),
  viewsCount: integer('views_count').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.channel, table.id] }),
}));

// ─── 2. TOPIC TAGS TABLE ──────────────────────────────────────
export const postTags = pgTable('post_tags', {
  id: uuid('id').defaultRandom().primaryKey(),
  channel: varchar('channel', { length: 100 }).notNull(),
  postId: integer('post_id').notNull(),
  tag: varchar('tag', { length: 50 }).notNull(), // 'tech', 'crypto', 'dev_tools', 'news', 'humor', 'finance', 'culture'
  confidence: integer('confidence').default(100).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const comments = pgTable('comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  channel: varchar('channel', { length: 100 }).notNull(),
  postId: integer('post_id').notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  content: text('content').notNull(),
  parentId: uuid('parent_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const postReactions = pgTable('post_reactions', {
  channel: varchar('channel', { length: 100 }).notNull(),
  postId: integer('post_id').notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  emoji: varchar('emoji', { length: 20 }).notNull(), // '🔥', '🎺', '💀', '❤️'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.channel, table.postId, table.userId, table.emoji] }),
}));

export const aiReviews = pgTable('ai_reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  channel: varchar('channel', { length: 100 }).notNull(),
  postId: integer('post_id').notNull(),
  kind: varchar('kind', { length: 50 }).notNull(), // 'summary', 'roast', 'fact_check', 'eli5'
  content: text('content').notNull(),
  modelUsed: varchar('model_used', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── 3. CHANNEL ROASTS (DAILY & ONBOARDING) ───────────────────
export const channelRoasts = pgTable('channel_roasts', {
  id: uuid('id').defaultRandom().primaryKey(),
  channel: varchar('channel', { length: 100 }).notNull(),
  roastType: varchar('roast_type', { length: 50 }).notNull(), // 'onboarding', 'daily', 'chaos_spike'
  content: text('content').notNull(),
  postCount: integer('post_count').default(0).notNull(),
  chaosScore: integer('chaos_score').default(50).notNull(), // 1 - 100
  modelUsed: varchar('model_used', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── 4. ROAST BATTLES ─────────────────────────────────────────
export const roastBattles = pgTable('roast_battles', {
  id: uuid('id').defaultRandom().primaryKey(),
  channelA: varchar('channel_a', { length: 100 }).notNull(),
  channelB: varchar('channel_b', { length: 100 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  weekNumber: integer('week_number').notNull(),
  year: integer('year').notNull(),
  channelAVotes: integer('channel_a_votes').default(0).notNull(),
  channelBVotes: integer('channel_b_votes').default(0).notNull(),
  channelARoast: text('channel_a_roast'),
  channelBRoast: text('channel_b_roast'),
  status: varchar('status', { length: 20 }).default('active').notNull(), // 'active', 'completed', 'upcoming'
  winnerChannel: varchar('winner_channel', { length: 100 }),
  startsAt: timestamp('starts_at', { withTimezone: true }).defaultNow().notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const battleVotes = pgTable('battle_votes', {
  battleId: uuid('battle_id').references(() => roastBattles.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  votedFor: varchar('voted_for', { length: 50 }).notNull(), // 'A' or 'B' or channelId
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.battleId, table.userId] }),
}));

// ─── 5. WEEKLY LEADERBOARDS ───────────────────────────────────
export const weeklyLeaderboards = pgTable('weekly_leaderboards', {
  id: uuid('id').defaultRandom().primaryKey(),
  weekNumber: integer('week_number').notNull(),
  year: integer('year').notNull(),
  category: varchar('category', { length: 50 }).notNull(), // 'top_commentator', 'streak_champion', 'most_active_channel', 'chaos_lord'
  rank: integer('rank').notNull(),
  entityId: varchar('entity_id', { length: 100 }).notNull(), // userId or channelId
  entityName: varchar('entity_name', { length: 200 }).notNull(),
  entityAvatar: text('entity_avatar'),
  score: integer('score').default(0).notNull(),
  badge: varchar('badge', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ─── 6. PUBLIC ROADMAP & FEATURE VOTING ───────────────────────
export const featureRequests = pgTable('feature_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  category: varchar('category', { length: 50 }).default('general').notNull(), // 'utility', 'fun', 'creator', 'general'
  upvoteCount: integer('upvote_count').default(0).notNull(),
  status: varchar('status', { length: 20 }).default('open').notNull(), // 'open', 'planned', 'in_progress', 'shipped'
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  creatorName: varchar('creator_name', { length: 200 }).default('Anonymous Scribe').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const featureUpvotes = pgTable('feature_upvotes', {
  featureId: uuid('feature_id').references(() => featureRequests.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.featureId, table.userId] }),
}));

export const moderationReports = pgTable('moderation_reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  targetType: varchar('target_type', { length: 20 }).notNull(), // 'post' or 'comment'
  channel: varchar('channel', { length: 100 }).notNull(),
  postId: integer('post_id'),
  commentId: uuid('comment_id'),
  reason: varchar('reason', { length: 100 }).notNull(),
  details: text('details'),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending', 'reviewed', 'dismissed'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const dailySummaries = pgTable('daily_summaries', {
  id: text('id').primaryKey(),
  channel: varchar('channel', { length: 100 }).notNull().default('dagmawi_babi'),
  localDate: date('local_date').notNull(),
  summaryText: text('summary_text').notNull(),
  postCount: integer('post_count').notNull(),
  language: varchar('language', { length: 10 }).notNull().default('am'),
  modelUsed: varchar('model_used', { length: 100 }),
  generatedAt: timestamp('generated_at', { withTimezone: true }).defaultNow(),
  isFinal: boolean('is_final').default(false),
});

export const ingestionCursor = pgTable('ingestion_cursor', {
  id: varchar('id', { length: 50 }).primaryKey(),
  lastMessageId: integer('last_message_id').notNull(),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }).defaultNow(),
});
