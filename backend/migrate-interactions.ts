import 'dotenv/config';
import { db } from './src/config/db.js';
import { sql } from 'drizzle-orm';

async function migrateInteractions() {
    console.log('Starting interactions migration...');

    try {
        // Create bookmarks table
        console.log('Creating bookmarks table...');
        await db.run(sql`
      CREATE TABLE IF NOT EXISTS bookmarks (
        id text PRIMARY KEY NOT NULL,
        user_id text NOT NULL,
        article_id text NOT NULL,
        country_code text NOT NULL,
        created_at integer DEFAULT (unixepoch()) NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

        // Create indices for bookmarks
        await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS bookmarks_user_article_unique ON bookmarks (user_id, article_id)`);
        await db.run(sql`CREATE INDEX IF NOT EXISTS bookmarks_user_idx ON bookmarks (user_id)`);
        await db.run(sql`CREATE INDEX IF NOT EXISTS bookmarks_article_idx ON bookmarks (article_id)`);

        // Create reading_history table
        console.log('Creating reading_history table...');
        await db.run(sql`
      CREATE TABLE IF NOT EXISTS reading_history (
        id text PRIMARY KEY NOT NULL,
        user_id text NOT NULL,
        article_id text NOT NULL,
        country_code text NOT NULL,
        viewed_at integer DEFAULT (unixepoch()) NOT NULL,
        time_spent_seconds integer DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

        // Create indices for reading_history
        await db.run(sql`CREATE INDEX IF NOT EXISTS reading_history_user_idx ON reading_history (user_id)`);
        await db.run(sql`CREATE INDEX IF NOT EXISTS reading_history_article_idx ON reading_history (article_id)`);
        await db.run(sql`CREATE INDEX IF NOT EXISTS reading_history_viewed_at_idx ON reading_history (viewed_at)`);

        // Ensure article_reactions table exists (it might strictly, but good to be safe)
        console.log('Ensuring article_reactions table...');
        await db.run(sql`
      CREATE TABLE IF NOT EXISTS article_reactions (
        id text PRIMARY KEY NOT NULL,
        user_id text NOT NULL,
        article_id text NOT NULL,
        country_code text NOT NULL,
        reaction_type text NOT NULL, -- 'like' or 'dislike'
        created_at integer DEFAULT (unixepoch()) NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

        await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS article_reactions_unique ON article_reactions (user_id, article_id, country_code)`);
        await db.run(sql`CREATE INDEX IF NOT EXISTS article_reactions_user_idx ON article_reactions (user_id)`);
        await db.run(sql`CREATE INDEX IF NOT EXISTS article_reactions_article_idx ON article_reactions (article_id, country_code)`);

        console.log('✅ Interactions migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrateInteractions();
