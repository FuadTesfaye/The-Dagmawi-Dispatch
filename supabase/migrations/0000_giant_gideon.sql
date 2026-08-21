CREATE TABLE "ai_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel" varchar(100) NOT NULL,
	"post_id" integer NOT NULL,
	"kind" varchar(50) NOT NULL,
	"content" text NOT NULL,
	"model_used" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "battle_votes" (
	"battle_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"voted_for" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "battle_votes_battle_id_user_id_pk" PRIMARY KEY("battle_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "channel_roasts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel" varchar(100) NOT NULL,
	"roast_type" varchar(50) NOT NULL,
	"content" text NOT NULL,
	"post_count" integer DEFAULT 0 NOT NULL,
	"chaos_score" integer DEFAULT 50 NOT NULL,
	"model_used" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel" varchar(100) NOT NULL,
	"post_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"content" text NOT NULL,
	"parent_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_summaries" (
	"id" text PRIMARY KEY NOT NULL,
	"channel" varchar(100) DEFAULT 'dagmawi_babi' NOT NULL,
	"local_date" date NOT NULL,
	"summary_text" text NOT NULL,
	"post_count" integer NOT NULL,
	"language" varchar(10) DEFAULT 'am' NOT NULL,
	"model_used" varchar(100),
	"generated_at" timestamp with time zone DEFAULT now(),
	"is_final" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "digest_subscriptions" (
	"user_id" uuid NOT NULL,
	"channel_id" varchar(100) NOT NULL,
	"delivery_time" varchar(10) DEFAULT '08:00' NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "digest_subscriptions_user_id_channel_id_pk" PRIMARY KEY("user_id","channel_id")
);
--> statement-breakpoint
CREATE TABLE "feature_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"category" varchar(50) DEFAULT 'general' NOT NULL,
	"upvote_count" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"created_by" uuid,
	"creator_name" varchar(200) DEFAULT 'Anonymous Scribe' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_upvotes" (
	"feature_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feature_upvotes_feature_id_user_id_pk" PRIMARY KEY("feature_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "ingestion_cursor" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"last_message_id" integer NOT NULL,
	"last_synced_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "moderation_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"target_type" varchar(20) NOT NULL,
	"channel" varchar(100) NOT NULL,
	"post_id" integer,
	"comment_id" uuid,
	"reason" varchar(100) NOT NULL,
	"details" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "post_reactions" (
	"channel" varchar(100) NOT NULL,
	"post_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"emoji" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_reactions_channel_post_id_user_id_emoji_pk" PRIMARY KEY("channel","post_id","user_id","emoji")
);
--> statement-breakpoint
CREATE TABLE "post_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel" varchar(100) NOT NULL,
	"post_id" integer NOT NULL,
	"tag" varchar(50) NOT NULL,
	"confidence" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"channel" varchar(100) DEFAULT 'dagmawi_babi' NOT NULL,
	"id" integer NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"local_date" date NOT NULL,
	"text" text,
	"media_type" varchar(50) DEFAULT 'none' NOT NULL,
	"has_caption_only" boolean DEFAULT false,
	"permalink" text,
	"raw_json" jsonb,
	"views_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "posts_channel_id_pk" PRIMARY KEY("channel","id")
);
--> statement-breakpoint
CREATE TABLE "roast_battles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_a" varchar(100) NOT NULL,
	"channel_b" varchar(100) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"week_number" integer NOT NULL,
	"year" integer NOT NULL,
	"channel_a_votes" integer DEFAULT 0 NOT NULL,
	"channel_b_votes" integer DEFAULT 0 NOT NULL,
	"channel_a_roast" text,
	"channel_b_roast" text,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"winner_channel" varchar(100),
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"user_id" uuid NOT NULL,
	"channel_id" varchar(100) NOT NULL,
	"is_muted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_user_id_channel_id_pk" PRIMARY KEY("user_id","channel_id")
);
--> statement-breakpoint
CREATE TABLE "tracked_channels" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"avatar_url" text,
	"subscriber_count" integer DEFAULT 0 NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"author_telegram_id" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"telegram_user_id" varchar(100) NOT NULL,
	"username" varchar(100),
	"display_name" varchar(200) NOT NULL,
	"photo_url" text,
	"role" varchar(20) DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_telegram_user_id_unique" UNIQUE("telegram_user_id")
);
--> statement-breakpoint
CREATE TABLE "weekly_leaderboards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"week_number" integer NOT NULL,
	"year" integer NOT NULL,
	"category" varchar(50) NOT NULL,
	"rank" integer NOT NULL,
	"entity_id" varchar(100) NOT NULL,
	"entity_name" varchar(200) NOT NULL,
	"entity_avatar" text,
	"score" integer DEFAULT 0 NOT NULL,
	"badge" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "battle_votes" ADD CONSTRAINT "battle_votes_battle_id_roast_battles_id_fk" FOREIGN KEY ("battle_id") REFERENCES "public"."roast_battles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "battle_votes" ADD CONSTRAINT "battle_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digest_subscriptions" ADD CONSTRAINT "digest_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digest_subscriptions" ADD CONSTRAINT "digest_subscriptions_channel_id_tracked_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."tracked_channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_requests" ADD CONSTRAINT "feature_requests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_upvotes" ADD CONSTRAINT "feature_upvotes_feature_id_feature_requests_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."feature_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_upvotes" ADD CONSTRAINT "feature_upvotes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_reports" ADD CONSTRAINT "moderation_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_reactions" ADD CONSTRAINT "post_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_channel_id_tracked_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."tracked_channels"("id") ON DELETE cascade ON UPDATE no action;