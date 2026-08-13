import { pgTable, text, timestamp, boolean, integer, jsonb, date, varchar, primaryKey } from 'drizzle-orm/pg-core';

export const posts = pgTable('posts', {
  channel: varchar('channel', { length: 100 }).notNull().default('dagmawi_babi'),
  id: integer('id').notNull(), // Telegram message ID
  date: timestamp('date', { withTimezone: true }).notNull(),
  local_date: date('local_date').notNull(),
  text: text('text'),
  media_type: varchar('media_type', { length: 50 }).notNull().default('none'),
  has_caption_only: boolean('has_caption_only').default(false),
  permalink: text('permalink'),
  raw_json: jsonb('raw_json'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.channel, table.id] }),
  }
});

export const dailySummaries = pgTable('daily_summaries', {
  id: text('id').primaryKey(), // `${channel}:${local_date}`
  channel: varchar('channel', { length: 100 }).notNull().default('dagmawi_babi'),
  local_date: date('local_date').notNull(),
  summary_text: text('summary_text').notNull(),
  post_count: integer('post_count').notNull(),
  language: varchar('language', { length: 10 }).notNull().default('am'),
  model_used: varchar('model_used', { length: 100 }),
  generated_at: timestamp('generated_at', { withTimezone: true }).defaultNow(),
  is_final: boolean('is_final').default(false),
});

export const subscribers = pgTable('subscribers', {
  telegram_user_id: varchar('telegram_user_id', { length: 100 }).primaryKey(),
  chat_id: varchar('chat_id', { length: 100 }).notNull(),
  subscribed_at: timestamp('subscribed_at', { withTimezone: true }).defaultNow(),
  preferred_language: varchar('preferred_language', { length: 10 }).default('am'),
  active: boolean('active').default(true),
});

export const ingestionCursor = pgTable('ingestion_cursor', {
  id: varchar('id', { length: 50 }).primaryKey(), // channel_id
  last_message_id: integer('last_message_id').notNull(),
  last_synced_at: timestamp('last_synced_at', { withTimezone: true }).defaultNow(),
});

export const guesses = pgTable('guesses', {
  id: text('id').primaryKey(), // `${channel}:${local_date}:${telegram_user_id}`
  channel: varchar('channel', { length: 100 }).notNull().default('dagmawi_babi'),
  local_date: date('local_date').notNull(),
  telegram_user_id: varchar('telegram_user_id', { length: 100 }).notNull(),
  display_name: varchar('display_name', { length: 200 }).notNull(),
  guess: integer('guess').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const userChannels = pgTable('user_channels', {
  telegram_user_id: varchar('telegram_user_id', { length: 100 }).primaryKey(),
  channel: varchar('channel', { length: 100 }).notNull().default('dagmawi_babi'),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
