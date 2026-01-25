import 'dotenv/config';
import { db } from '../src/config/db.js';
import { sql } from 'drizzle-orm';
import { logger } from '../src/config/logger.js';

async function fixSchema() {
    logger.info('Starting schema fix...');

    try {
        // 1. Create pending_alignment_notifications
        logger.info('Creating pending_alignment_notifications table...');
        await db.run(sql`
            CREATE TABLE IF NOT EXISTS pending_alignment_notifications (
                id text PRIMARY KEY NOT NULL,
                user_id text NOT NULL,
                source_id integer NOT NULL,
                source_name text NOT NULL,
                old_score integer,
                new_score integer NOT NULL,
                old_label text,
                new_label text,
                change_reason text,
                status text DEFAULT 'pending' NOT NULL,
                created_at integer DEFAULT (unixepoch()) NOT NULL,
                sent_at integer
            );
        `);
        await db.run(sql`CREATE INDEX IF NOT EXISTS pending_alignment_notif_user_idx ON pending_alignment_notifications (user_id);`);
        await db.run(sql`CREATE INDEX IF NOT EXISTS pending_alignment_notif_status_idx ON pending_alignment_notifications (status);`);

        // 2. Create notifications
        logger.info('Creating notifications table...');
        await db.run(sql`
            CREATE TABLE IF NOT EXISTS notifications (
                id text PRIMARY KEY NOT NULL,
                user_id text NOT NULL,
                type text NOT NULL,
                title text NOT NULL,
                body text NOT NULL,
                data text,
                is_read integer DEFAULT false NOT NULL,
                sent_at integer DEFAULT (unixepoch()) NOT NULL
            );
        `);
        await db.run(sql`CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id);`);

        // 3. Create user_notification_preferences
        logger.info('Creating user_notification_preferences table...');
        await db.run(sql`
            CREATE TABLE IF NOT EXISTS user_notification_preferences (
                user_id text PRIMARY KEY NOT NULL,
                notif_followed_sources integer DEFAULT true NOT NULL,
                notif_daily_digest integer DEFAULT true NOT NULL,
                notif_weekly_comparison integer DEFAULT true NOT NULL,
                notif_breaking_news integer DEFAULT true NOT NULL,
                notif_comments integer DEFAULT true NOT NULL,
                notif_alignment_changes integer DEFAULT true NOT NULL,
                updated_at integer DEFAULT (unixepoch()) NOT NULL
            );
        `);

        // 4. Create source_alignment_votes
        logger.info('Creating source_alignment_votes table...');
        await db.run(sql`
            CREATE TABLE IF NOT EXISTS source_alignment_votes (
                id text PRIMARY KEY NOT NULL,
                user_id text NOT NULL,
                source_id integer NOT NULL,
                vote_type text NOT NULL,
                suggested_score integer,
                comment text,
                created_at integer DEFAULT (unixepoch()) NOT NULL,
                updated_at integer DEFAULT (unixepoch()) NOT NULL
            );
        `);
        await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS source_alignment_votes_user_source_unique ON source_alignment_votes (user_id, source_id);`);

        logger.info('✅ Schema fix completed successfully!');
    } catch (error) {
        logger.error({ error }, 'Failed to fix schema');
        process.exit(1);
    }
}

fixSchema();
