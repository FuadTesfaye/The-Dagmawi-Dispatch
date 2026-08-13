import { pgTable, text, timestamp, boolean, integer, jsonb, date, varchar } from 'drizzle-orm/pg-core';

export const posts = pgTable('posts', {
  id: integer('id').primaryKey(), // Telegram message ID
  date: timestamp('date', { withTimezone: true }).notNull(),
  local_date: date('local_date').notNull(),
  text: text('text'),
  media_type: varchar('media_type', { length: 50 }).notNull().default('none'),
  has_caption_only: boolean('has_caption_only').default(false),
  permalink: text('permalink'),
  raw_json: jsonb('raw_json'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const dailySummaries = pgTable('daily_summaries', {
  local_date: date('local_date').primaryKey(),
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
  id: varchar('id', { length: 50 }).primaryKey(), // 'channel_id' or 'default'
  last_message_id: integer('last_message_id').notNull(),
  last_synced_at: timestamp('last_synced_at', { withTimezone: true }).defaultNow(),
});
