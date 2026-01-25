CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`icon` text,
	`color` text
);
--> statement-breakpoint
CREATE TABLE `rss_sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`country_code` text NOT NULL,
	`source_name` text NOT NULL,
	`source_logo_url` text NOT NULL,
	`rss_url` text,
	`api_endpoint` text,
	`api_key` text,
	`is_active` integer DEFAULT true NOT NULL,
	`scrape_interval_minutes` integer DEFAULT 30 NOT NULL,
	`bias_score_system` real,
	`bias_score_user` real,
	`bias_vote_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `topics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`hashtag` text NOT NULL,
	`article_count` integer DEFAULT 0 NOT NULL,
	`trending_score` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`avatar_url` text,
	`user_role` text DEFAULT 'user' NOT NULL,
	`subscription_status` text DEFAULT 'free' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `de_article_polls` (
	`id` text PRIMARY KEY NOT NULL,
	`article_id` text NOT NULL,
	`question` text NOT NULL,
	`options` text NOT NULL,
	`vote_counts` text NOT NULL,
	`total_votes` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`expires_at` integer
);
--> statement-breakpoint
CREATE TABLE `de_article_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`article_id` text NOT NULL,
	`source_name` text NOT NULL,
	`source_logo_url` text NOT NULL,
	`source_url` text NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	`added_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `de_article_topics` (
	`article_id` text NOT NULL,
	`topic_id` integer NOT NULL,
	PRIMARY KEY(`article_id`, `topic_id`)
);
--> statement-breakpoint
CREATE TABLE `de_articles` (
	`id` text PRIMARY KEY NOT NULL,
	`original_title` text NOT NULL,
	`original_content` text,
	`original_language` text NOT NULL,
	`translated_title` text NOT NULL,
	`summary` text NOT NULL,
	`is_clickbait` integer NOT NULL,
	`is_ad` integer NOT NULL,
	`is_filtered` integer NOT NULL,
	`source_count` integer DEFAULT 1 NOT NULL,
	`sentiment` text,
	`category_id` integer,
	`published_at` integer NOT NULL,
	`scraped_at` integer DEFAULT (unixepoch()) NOT NULL,
	`view_count` integer DEFAULT 0 NOT NULL,
	`like_count` integer DEFAULT 0 NOT NULL,
	`dislike_count` integer DEFAULT 0 NOT NULL,
	`comment_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `de_daily_digests` (
	`id` text PRIMARY KEY NOT NULL,
	`country_code` text NOT NULL,
	`period` text NOT NULL,
	`digest_date` text NOT NULL,
	`summary_text` text NOT NULL,
	`top_topics` text NOT NULL,
	`article_count` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`comment_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tr_article_polls` (
	`id` text PRIMARY KEY NOT NULL,
	`article_id` text NOT NULL,
	`question` text NOT NULL,
	`options` text NOT NULL,
	`vote_counts` text NOT NULL,
	`total_votes` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`expires_at` integer
);
--> statement-breakpoint
CREATE TABLE `tr_article_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`article_id` text NOT NULL,
	`source_name` text NOT NULL,
	`source_logo_url` text NOT NULL,
	`source_url` text NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	`added_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tr_article_topics` (
	`article_id` text NOT NULL,
	`topic_id` integer NOT NULL,
	PRIMARY KEY(`article_id`, `topic_id`)
);
--> statement-breakpoint
CREATE TABLE `tr_articles` (
	`id` text PRIMARY KEY NOT NULL,
	`original_title` text NOT NULL,
	`original_content` text,
	`original_language` text NOT NULL,
	`translated_title` text NOT NULL,
	`summary` text NOT NULL,
	`is_clickbait` integer NOT NULL,
	`is_ad` integer NOT NULL,
	`is_filtered` integer NOT NULL,
	`source_count` integer DEFAULT 1 NOT NULL,
	`sentiment` text,
	`category_id` integer,
	`published_at` integer NOT NULL,
	`scraped_at` integer DEFAULT (unixepoch()) NOT NULL,
	`view_count` integer DEFAULT 0 NOT NULL,
	`like_count` integer DEFAULT 0 NOT NULL,
	`dislike_count` integer DEFAULT 0 NOT NULL,
	`comment_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tr_daily_digests` (
	`id` text PRIMARY KEY NOT NULL,
	`country_code` text NOT NULL,
	`period` text NOT NULL,
	`digest_date` text NOT NULL,
	`summary_text` text NOT NULL,
	`top_topics` text NOT NULL,
	`article_count` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`comment_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `us_article_polls` (
	`id` text PRIMARY KEY NOT NULL,
	`article_id` text NOT NULL,
	`question` text NOT NULL,
	`options` text NOT NULL,
	`vote_counts` text NOT NULL,
	`total_votes` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`expires_at` integer
);
--> statement-breakpoint
CREATE TABLE `us_article_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`article_id` text NOT NULL,
	`source_name` text NOT NULL,
	`source_logo_url` text NOT NULL,
	`source_url` text NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	`added_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `us_article_topics` (
	`article_id` text NOT NULL,
	`topic_id` integer NOT NULL,
	PRIMARY KEY(`article_id`, `topic_id`)
);
--> statement-breakpoint
CREATE TABLE `us_articles` (
	`id` text PRIMARY KEY NOT NULL,
	`original_title` text NOT NULL,
	`original_content` text,
	`original_language` text NOT NULL,
	`translated_title` text NOT NULL,
	`summary` text NOT NULL,
	`is_clickbait` integer NOT NULL,
	`is_ad` integer NOT NULL,
	`is_filtered` integer NOT NULL,
	`source_count` integer DEFAULT 1 NOT NULL,
	`sentiment` text,
	`category_id` integer,
	`published_at` integer NOT NULL,
	`scraped_at` integer DEFAULT (unixepoch()) NOT NULL,
	`view_count` integer DEFAULT 0 NOT NULL,
	`like_count` integer DEFAULT 0 NOT NULL,
	`dislike_count` integer DEFAULT 0 NOT NULL,
	`comment_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `us_daily_digests` (
	`id` text PRIMARY KEY NOT NULL,
	`country_code` text NOT NULL,
	`period` text NOT NULL,
	`digest_date` text NOT NULL,
	`summary_text` text NOT NULL,
	`top_topics` text NOT NULL,
	`article_count` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`comment_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `article_reactions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`article_id` text NOT NULL,
	`country_code` text NOT NULL,
	`reaction_type` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`article_id`, `country_code`, `user_id`)
);
--> statement-breakpoint
CREATE TABLE `comments` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`country_code` text,
	`content` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`data` text,
	`is_read` integer DEFAULT false NOT NULL,
	`sent_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `poll_votes` (
	`id` text PRIMARY KEY NOT NULL,
	`poll_id` text NOT NULL,
	`user_id` text NOT NULL,
	`option_index` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`poll_id`, `user_id`)
);
--> statement-breakpoint
CREATE TABLE `source_bias_votes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`source_id` integer NOT NULL,
	`score` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`source_id`, `user_id`)
);
--> statement-breakpoint
CREATE TABLE `user_category_preferences` (
	`user_id` text NOT NULL,
	`category_id` integer NOT NULL,
	PRIMARY KEY(`category_id`, `user_id`)
);
--> statement-breakpoint
CREATE TABLE `user_devices` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`fcm_token` text NOT NULL,
	`device_type` text NOT NULL,
	`device_name` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`last_active` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_followed_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`source_id` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	PRIMARY KEY(`source_id`, `user_id`)
);
--> statement-breakpoint
CREATE TABLE `user_notification_preferences` (
	`user_id` text PRIMARY KEY NOT NULL,
	`notif_followed_sources` integer DEFAULT true NOT NULL,
	`notif_daily_digest` integer DEFAULT true NOT NULL,
	`notif_weekly_comparison` integer DEFAULT true NOT NULL,
	`notif_breaking_news` integer DEFAULT true NOT NULL,
	`notif_comments` integer DEFAULT true NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `weekly_comparisons` (
	`id` text PRIMARY KEY NOT NULL,
	`week_start` text NOT NULL,
	`week_end` text NOT NULL,
	`countries_data` text NOT NULL,
	`comparison_text` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`comment_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_slug_unique` ON `categories` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `topics_hashtag_unique` ON `topics` (`hashtag`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);