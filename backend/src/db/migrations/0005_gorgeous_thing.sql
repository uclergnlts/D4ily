CREATE TABLE `es_article_polls` (
	`id` text PRIMARY KEY NOT NULL,
	`article_id` text NOT NULL,
	`question` text NOT NULL,
	`options` text NOT NULL,
	`results` text NOT NULL,
	`total_votes` integer DEFAULT 0 NOT NULL,
	`expires_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `es_article_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`article_id` text NOT NULL,
	`source_name` text NOT NULL,
	`source_logo_url` text NOT NULL,
	`source_url` text NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	`added_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `es_article_topics` (
	`article_id` text NOT NULL,
	`topic_id` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `es_articles` (
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
	`political_tone` integer DEFAULT 0 NOT NULL,
	`political_confidence` real DEFAULT 0 NOT NULL,
	`government_mentioned` integer DEFAULT false NOT NULL,
	`emotional_tone` text,
	`emotional_intensity` real,
	`loaded_language_score` real,
	`sensationalism_score` real,
	`category_id` integer,
	`published_at` integer NOT NULL,
	`scraped_at` integer DEFAULT (unixepoch()) NOT NULL,
	`view_count` integer DEFAULT 0 NOT NULL,
	`like_count` integer DEFAULT 0 NOT NULL,
	`dislike_count` integer DEFAULT 0 NOT NULL,
	`comment_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `es_daily_digests` (
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
CREATE TABLE `fr_article_polls` (
	`id` text PRIMARY KEY NOT NULL,
	`article_id` text NOT NULL,
	`question` text NOT NULL,
	`options` text NOT NULL,
	`results` text NOT NULL,
	`total_votes` integer DEFAULT 0 NOT NULL,
	`expires_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `fr_article_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`article_id` text NOT NULL,
	`source_name` text NOT NULL,
	`source_logo_url` text NOT NULL,
	`source_url` text NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	`added_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `fr_article_topics` (
	`article_id` text NOT NULL,
	`topic_id` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `fr_articles` (
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
	`political_tone` integer DEFAULT 0 NOT NULL,
	`political_confidence` real DEFAULT 0 NOT NULL,
	`government_mentioned` integer DEFAULT false NOT NULL,
	`emotional_tone` text,
	`emotional_intensity` real,
	`loaded_language_score` real,
	`sensationalism_score` real,
	`category_id` integer,
	`published_at` integer NOT NULL,
	`scraped_at` integer DEFAULT (unixepoch()) NOT NULL,
	`view_count` integer DEFAULT 0 NOT NULL,
	`like_count` integer DEFAULT 0 NOT NULL,
	`dislike_count` integer DEFAULT 0 NOT NULL,
	`comment_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `fr_daily_digests` (
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
CREATE TABLE `it_article_polls` (
	`id` text PRIMARY KEY NOT NULL,
	`article_id` text NOT NULL,
	`question` text NOT NULL,
	`options` text NOT NULL,
	`results` text NOT NULL,
	`total_votes` integer DEFAULT 0 NOT NULL,
	`expires_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `it_article_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`article_id` text NOT NULL,
	`source_name` text NOT NULL,
	`source_logo_url` text NOT NULL,
	`source_url` text NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	`added_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `it_article_topics` (
	`article_id` text NOT NULL,
	`topic_id` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `it_articles` (
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
	`political_tone` integer DEFAULT 0 NOT NULL,
	`political_confidence` real DEFAULT 0 NOT NULL,
	`government_mentioned` integer DEFAULT false NOT NULL,
	`emotional_tone` text,
	`emotional_intensity` real,
	`loaded_language_score` real,
	`sensationalism_score` real,
	`category_id` integer,
	`published_at` integer NOT NULL,
	`scraped_at` integer DEFAULT (unixepoch()) NOT NULL,
	`view_count` integer DEFAULT 0 NOT NULL,
	`like_count` integer DEFAULT 0 NOT NULL,
	`dislike_count` integer DEFAULT 0 NOT NULL,
	`comment_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `it_daily_digests` (
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
CREATE TABLE `ru_article_polls` (
	`id` text PRIMARY KEY NOT NULL,
	`article_id` text NOT NULL,
	`question` text NOT NULL,
	`options` text NOT NULL,
	`results` text NOT NULL,
	`total_votes` integer DEFAULT 0 NOT NULL,
	`expires_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ru_article_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`article_id` text NOT NULL,
	`source_name` text NOT NULL,
	`source_logo_url` text NOT NULL,
	`source_url` text NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	`added_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ru_article_topics` (
	`article_id` text NOT NULL,
	`topic_id` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ru_articles` (
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
	`political_tone` integer DEFAULT 0 NOT NULL,
	`political_confidence` real DEFAULT 0 NOT NULL,
	`government_mentioned` integer DEFAULT false NOT NULL,
	`emotional_tone` text,
	`emotional_intensity` real,
	`loaded_language_score` real,
	`sensationalism_score` real,
	`category_id` integer,
	`published_at` integer NOT NULL,
	`scraped_at` integer DEFAULT (unixepoch()) NOT NULL,
	`view_count` integer DEFAULT 0 NOT NULL,
	`like_count` integer DEFAULT 0 NOT NULL,
	`dislike_count` integer DEFAULT 0 NOT NULL,
	`comment_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ru_daily_digests` (
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
CREATE TABLE `uk_article_polls` (
	`id` text PRIMARY KEY NOT NULL,
	`article_id` text NOT NULL,
	`question` text NOT NULL,
	`options` text NOT NULL,
	`results` text NOT NULL,
	`total_votes` integer DEFAULT 0 NOT NULL,
	`expires_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `uk_article_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`article_id` text NOT NULL,
	`source_name` text NOT NULL,
	`source_logo_url` text NOT NULL,
	`source_url` text NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	`added_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `uk_article_topics` (
	`article_id` text NOT NULL,
	`topic_id` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `uk_articles` (
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
	`political_tone` integer DEFAULT 0 NOT NULL,
	`political_confidence` real DEFAULT 0 NOT NULL,
	`government_mentioned` integer DEFAULT false NOT NULL,
	`emotional_tone` text,
	`emotional_intensity` real,
	`loaded_language_score` real,
	`sensationalism_score` real,
	`category_id` integer,
	`published_at` integer NOT NULL,
	`scraped_at` integer DEFAULT (unixepoch()) NOT NULL,
	`view_count` integer DEFAULT 0 NOT NULL,
	`like_count` integer DEFAULT 0 NOT NULL,
	`dislike_count` integer DEFAULT 0 NOT NULL,
	`comment_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `uk_daily_digests` (
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
CREATE INDEX `es_articles_published_idx` ON `es_articles` (`published_at`);--> statement-breakpoint
CREATE INDEX `es_articles_category_idx` ON `es_articles` (`category_id`);--> statement-breakpoint
CREATE INDEX `es_articles_political_tone_idx` ON `es_articles` (`political_tone`);--> statement-breakpoint
CREATE INDEX `fr_articles_published_idx` ON `fr_articles` (`published_at`);--> statement-breakpoint
CREATE INDEX `fr_articles_category_idx` ON `fr_articles` (`category_id`);--> statement-breakpoint
CREATE INDEX `fr_articles_political_tone_idx` ON `fr_articles` (`political_tone`);--> statement-breakpoint
CREATE INDEX `it_articles_published_idx` ON `it_articles` (`published_at`);--> statement-breakpoint
CREATE INDEX `it_articles_category_idx` ON `it_articles` (`category_id`);--> statement-breakpoint
CREATE INDEX `it_articles_political_tone_idx` ON `it_articles` (`political_tone`);--> statement-breakpoint
CREATE INDEX `ru_articles_published_idx` ON `ru_articles` (`published_at`);--> statement-breakpoint
CREATE INDEX `ru_articles_category_idx` ON `ru_articles` (`category_id`);--> statement-breakpoint
CREATE INDEX `ru_articles_political_tone_idx` ON `ru_articles` (`political_tone`);--> statement-breakpoint
CREATE INDEX `uk_articles_published_idx` ON `uk_articles` (`published_at`);--> statement-breakpoint
CREATE INDEX `uk_articles_category_idx` ON `uk_articles` (`category_id`);--> statement-breakpoint
CREATE INDEX `uk_articles_political_tone_idx` ON `uk_articles` (`political_tone`);