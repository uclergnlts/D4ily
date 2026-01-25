ALTER TABLE de_article_sources ADD `id` text PRIMARY KEY NOT NULL;--> statement-breakpoint
ALTER TABLE de_articles ADD `political_tone` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE de_articles ADD `political_confidence` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE tr_article_sources ADD `id` text PRIMARY KEY NOT NULL;--> statement-breakpoint
ALTER TABLE tr_articles ADD `political_tone` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE tr_articles ADD `political_confidence` real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE us_article_sources ADD `id` text PRIMARY KEY NOT NULL;--> statement-breakpoint
ALTER TABLE us_articles ADD `political_tone` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE us_articles ADD `political_confidence` real DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `de_articles_political_tone_idx` ON `de_articles` (`political_tone`);--> statement-breakpoint
CREATE INDEX `tr_articles_political_tone_idx` ON `tr_articles` (`political_tone`);--> statement-breakpoint
CREATE INDEX `us_articles_political_tone_idx` ON `us_articles` (`political_tone`);