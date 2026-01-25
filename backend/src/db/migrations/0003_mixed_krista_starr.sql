CREATE TABLE `article_perspectives` (
	`id` text PRIMARY KEY NOT NULL,
	`main_article_id` text NOT NULL,
	`related_article_id` text NOT NULL,
	`similarity_score` real NOT NULL,
	`matched_entities` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `source_alignment_history` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` integer NOT NULL,
	`old_score` integer,
	`new_score` integer NOT NULL,
	`old_label` text,
	`new_label` text,
	`reason` text NOT NULL,
	`updated_by` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `rss_sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `source_votes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`source_id` integer NOT NULL,
	`score` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_id`) REFERENCES `rss_sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `bookmarks` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`article_id` text NOT NULL,
	`country_code` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `comment_likes` (
	`id` text PRIMARY KEY NOT NULL,
	`comment_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `pending_alignment_notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`source_id` integer NOT NULL,
	`source_name` text NOT NULL,
	`old_score` integer,
	`new_score` integer NOT NULL,
	`old_label` text,
	`new_label` text,
	`change_reason` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`sent_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `reading_history` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`article_id` text NOT NULL,
	`country_code` text NOT NULL,
	`viewed_at` integer DEFAULT (unixepoch()) NOT NULL,
	`time_spent_seconds` integer DEFAULT 0,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `source_alignment_votes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`source_id` integer NOT NULL,
	`vote_type` text NOT NULL,
	`suggested_score` integer,
	`comment` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_alignment_reputation` (
	`user_id` text PRIMARY KEY NOT NULL,
	`total_votes` integer DEFAULT 0 NOT NULL,
	`accurate_votes` integer DEFAULT 0 NOT NULL,
	`reputation_score` real DEFAULT 0.5 NOT NULL,
	`last_vote_at` integer,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
DROP INDEX IF EXISTS `poll_votes_poll_id_user_id_unique`;--> statement-breakpoint
/*
You're trying to delete PRIMARY KEY(article_id,topic_id) from 'de_article_topics' table
SQLite does not supportprimary key deletion from existing table
You can do it in 3 steps with drizzle orm:
 - create new mirror table table without pk, rename current table to old_table, generate SQL
 - migrate old data from one table to another
 - delete old_table in schema, generate sql

or create manual migration like below:

ALTER TABLE table_name RENAME TO old_table;
CREATE TABLE table_name (
	column1 datatype [ NULL | NOT NULL ],
	column2 datatype [ NULL | NOT NULL ],
	...
	PRIMARY KEY (pk_col1, pk_col2, ... pk_col_n)
 );
INSERT INTO table_name SELECT * FROM old_table;

Due to that we don't generate migration automatically and it has to be done manually
*/
--> statement-breakpoint
/*
You're trying to delete PRIMARY KEY(article_id,topic_id) from 'tr_article_topics' table
SQLite does not supportprimary key deletion from existing table
You can do it in 3 steps with drizzle orm:
 - create new mirror table table without pk, rename current table to old_table, generate SQL
 - migrate old data from one table to another
 - delete old_table in schema, generate sql

or create manual migration like below:

ALTER TABLE table_name RENAME TO old_table;
CREATE TABLE table_name (
	column1 datatype [ NULL | NOT NULL ],
	column2 datatype [ NULL | NOT NULL ],
	...
	PRIMARY KEY (pk_col1, pk_col2, ... pk_col_n)
 );
INSERT INTO table_name SELECT * FROM old_table;

Due to that we don't generate migration automatically and it has to be done manually
*/
--> statement-breakpoint
/*
You're trying to delete PRIMARY KEY(article_id,topic_id) from 'us_article_topics' table
SQLite does not supportprimary key deletion from existing table
You can do it in 3 steps with drizzle orm:
 - create new mirror table table without pk, rename current table to old_table, generate SQL
 - migrate old data from one table to another
 - delete old_table in schema, generate sql

or create manual migration like below:

ALTER TABLE table_name RENAME TO old_table;
CREATE TABLE table_name (
	column1 datatype [ NULL | NOT NULL ],
	column2 datatype [ NULL | NOT NULL ],
	...
	PRIMARY KEY (pk_col1, pk_col2, ... pk_col_n)
 );
INSERT INTO table_name SELECT * FROM old_table;

Due to that we don't generate migration automatically and it has to be done manually
*/
--> statement-breakpoint
ALTER TABLE rss_sources ADD `gov_alignment_score` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE rss_sources ADD `gov_alignment_label` text;--> statement-breakpoint
ALTER TABLE rss_sources ADD `gov_alignment_confidence` real DEFAULT 0.7;--> statement-breakpoint
ALTER TABLE rss_sources ADD `gov_alignment_notes` text;--> statement-breakpoint
ALTER TABLE rss_sources ADD `gov_alignment_last_updated` integer;--> statement-breakpoint
ALTER TABLE de_article_polls ADD `results` text NOT NULL;--> statement-breakpoint
ALTER TABLE de_articles ADD `government_mentioned` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE de_articles ADD `emotional_tone` text;--> statement-breakpoint
ALTER TABLE de_articles ADD `emotional_intensity` real;--> statement-breakpoint
ALTER TABLE de_articles ADD `loaded_language_score` real;--> statement-breakpoint
ALTER TABLE de_articles ADD `sensationalism_score` real;--> statement-breakpoint
ALTER TABLE tr_article_polls ADD `results` text NOT NULL;--> statement-breakpoint
ALTER TABLE tr_articles ADD `government_mentioned` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE tr_articles ADD `emotional_tone` text;--> statement-breakpoint
ALTER TABLE tr_articles ADD `emotional_intensity` real;--> statement-breakpoint
ALTER TABLE tr_articles ADD `loaded_language_score` real;--> statement-breakpoint
ALTER TABLE tr_articles ADD `sensationalism_score` real;--> statement-breakpoint
ALTER TABLE us_article_polls ADD `results` text NOT NULL;--> statement-breakpoint
ALTER TABLE us_articles ADD `government_mentioned` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE us_articles ADD `emotional_tone` text;--> statement-breakpoint
ALTER TABLE us_articles ADD `emotional_intensity` real;--> statement-breakpoint
ALTER TABLE us_articles ADD `loaded_language_score` real;--> statement-breakpoint
ALTER TABLE us_articles ADD `sensationalism_score` real;--> statement-breakpoint
ALTER TABLE comments ADD `parent_comment_id` text;--> statement-breakpoint
ALTER TABLE comments ADD `like_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE comments ADD `updated_at` integer;--> statement-breakpoint
ALTER TABLE user_notification_preferences ADD `notif_alignment_changes` integer DEFAULT true NOT NULL;--> statement-breakpoint
CREATE INDEX `article_perspectives_main_idx` ON `article_perspectives` (`main_article_id`);--> statement-breakpoint
CREATE INDEX `article_perspectives_unique_pair` ON `article_perspectives` (`main_article_id`,`related_article_id`);--> statement-breakpoint
CREATE INDEX `source_alignment_history_source_idx` ON `source_alignment_history` (`source_id`);--> statement-breakpoint
CREATE INDEX `source_alignment_history_date_idx` ON `source_alignment_history` (`updated_at`);--> statement-breakpoint
CREATE INDEX `source_votes_user_source_idx` ON `source_votes` (`user_id`,`source_id`);--> statement-breakpoint
CREATE INDEX `bookmarks_user_idx` ON `bookmarks` (`user_id`);--> statement-breakpoint
CREATE INDEX `bookmarks_article_idx` ON `bookmarks` (`article_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `bookmarks_user_id_article_id_unique` ON `bookmarks` (`user_id`,`article_id`);--> statement-breakpoint
CREATE INDEX `comment_likes_comment_idx` ON `comment_likes` (`comment_id`);--> statement-breakpoint
CREATE INDEX `comment_likes_user_idx` ON `comment_likes` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `comment_likes_comment_id_user_id_unique` ON `comment_likes` (`comment_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `pending_alignment_notif_user_idx` ON `pending_alignment_notifications` (`user_id`);--> statement-breakpoint
CREATE INDEX `pending_alignment_notif_status_idx` ON `pending_alignment_notifications` (`status`);--> statement-breakpoint
CREATE INDEX `pending_alignment_notif_source_idx` ON `pending_alignment_notifications` (`source_id`);--> statement-breakpoint
CREATE INDEX `reading_history_user_idx` ON `reading_history` (`user_id`);--> statement-breakpoint
CREATE INDEX `reading_history_article_idx` ON `reading_history` (`article_id`);--> statement-breakpoint
CREATE INDEX `reading_history_viewed_at_idx` ON `reading_history` (`viewed_at`);--> statement-breakpoint
CREATE INDEX `source_alignment_votes_user_idx` ON `source_alignment_votes` (`user_id`);--> statement-breakpoint
CREATE INDEX `source_alignment_votes_source_idx` ON `source_alignment_votes` (`source_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `source_alignment_votes_user_id_source_id_unique` ON `source_alignment_votes` (`user_id`,`source_id`);--> statement-breakpoint
CREATE INDEX `de_articles_published_idx` ON `de_articles` (`published_at`);--> statement-breakpoint
CREATE INDEX `de_articles_category_idx` ON `de_articles` (`category_id`);--> statement-breakpoint
CREATE INDEX `tr_articles_published_idx` ON `tr_articles` (`published_at`);--> statement-breakpoint
CREATE INDEX `tr_articles_category_idx` ON `tr_articles` (`category_id`);--> statement-breakpoint
CREATE INDEX `us_articles_published_idx` ON `us_articles` (`published_at`);--> statement-breakpoint
CREATE INDEX `us_articles_category_idx` ON `us_articles` (`category_id`);--> statement-breakpoint
CREATE INDEX `comments_parent_idx` ON `comments` (`parent_comment_id`);--> statement-breakpoint
ALTER TABLE `de_article_polls` DROP COLUMN `vote_counts`;--> statement-breakpoint
ALTER TABLE `de_article_sources` DROP COLUMN `id`;--> statement-breakpoint
ALTER TABLE `tr_article_polls` DROP COLUMN `vote_counts`;--> statement-breakpoint
ALTER TABLE `tr_article_sources` DROP COLUMN `id`;--> statement-breakpoint
ALTER TABLE `us_article_polls` DROP COLUMN `vote_counts`;--> statement-breakpoint
ALTER TABLE `us_article_sources` DROP COLUMN `id`;