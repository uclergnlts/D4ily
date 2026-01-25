import 'dotenv/config';
import { db } from './src/config/db.js';
import { sql } from 'drizzle-orm';

async function migrateComments() {
    try {
        console.log('Creating comments table...');

        // Create comments table with all required fields
        await db.run(sql`
      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        country_code TEXT,
        content TEXT NOT NULL,
        parent_comment_id TEXT,
        like_count INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL DEFAULT (unixepoch()),
        updated_at INTEGER
      )
    `);

        console.log('✅ Comments table created');

        // Create indexes
        console.log('Creating indexes...');

        await db.run(sql`
      CREATE INDEX IF NOT EXISTS comments_target_idx 
      ON comments(target_type, target_id)
    `);

        await db.run(sql`
      CREATE INDEX IF NOT EXISTS comments_user_idx 
      ON comments(user_id)
    `);

        await db.run(sql`
      CREATE INDEX IF NOT EXISTS comments_parent_idx 
      ON comments(parent_comment_id)
    `);

        console.log('✅ Indexes created');
        console.log('🎉 Migration completed successfully!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrateComments();
