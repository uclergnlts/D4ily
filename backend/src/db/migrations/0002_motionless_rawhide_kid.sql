CREATE INDEX `rss_sources_country_idx` ON `rss_sources` (`country_code`);--> statement-breakpoint
CREATE INDEX `rss_sources_active_idx` ON `rss_sources` (`is_active`);--> statement-breakpoint
CREATE INDEX `topics_trending_idx` ON `topics` (`trending_score`);--> statement-breakpoint
CREATE INDEX `article_reactions_user_idx` ON `article_reactions` (`user_id`);--> statement-breakpoint
CREATE INDEX `article_reactions_article_idx` ON `article_reactions` (`article_id`,`country_code`);--> statement-breakpoint
CREATE INDEX `comments_target_idx` ON `comments` (`target_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `comments_user_idx` ON `comments` (`user_id`);--> statement-breakpoint
CREATE INDEX `notifications_user_idx` ON `notifications` (`user_id`);--> statement-breakpoint
CREATE INDEX `notifications_read_idx` ON `notifications` (`is_read`);--> statement-breakpoint
CREATE INDEX `poll_votes_poll_idx` ON `poll_votes` (`poll_id`);--> statement-breakpoint
CREATE INDEX `source_bias_votes_user_idx` ON `source_bias_votes` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_category_prefs_user_idx` ON `user_category_preferences` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_devices_user_idx` ON `user_devices` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_followed_sources_user_idx` ON `user_followed_sources` (`user_id`);--> statement-breakpoint
/*
 SQLite does not support "Creating foreign key on existing column" out of the box, we do not generate automatic migration for that, so it has to be done manually
 Please refer to: https://www.techonthenet.com/sqlite/tables/alter_table.php
                  https://www.sqlite.org/lang_altertable.html

 Due to that we don't generate migration automatically and it has to be done manually
*/