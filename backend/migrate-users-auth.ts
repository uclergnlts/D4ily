import 'dotenv/config';
import { db } from './src/config/db.js';
import { sql } from 'drizzle-orm';

async function migrateUsersAuth() {
    try {
        console.log('Migrating users table for authentication...');

        // Add authentication fields to existing users table
        console.log('Adding auth fields...');

        await db.run(sql`
      ALTER TABLE users ADD COLUMN display_name TEXT
    `);

        await db.run(sql`
      ALTER TABLE users ADD COLUMN photo_url TEXT
    `);

        await db.run(sql`
      ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0 NOT NULL
    `);

        await db.run(sql`
      ALTER TABLE users ADD COLUMN provider TEXT DEFAULT 'email' NOT NULL
    `);
        await db.run(sql`
      ALTER TABLE users ADD COLUMN last_login_at INTEGER
    `);

        await db.run(sql`
      ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1 NOT NULL
    `);

        await db.run(sql`
      ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user' NOT NULL
    `);

        // Rename name -> display_name if needed (SQLite doesn't support column rename easily)
        console.log('✅ Authentication fields added');

        console.log('🎉 Users table migration completed!');
        process.exit(0);
    } catch (error: any) {
        // Handle column already exists errors
        if (error.message?.includes('duplicate column name')) {
            console.log('⚠️ Column already exists, skipping...');
            console.log('🎉 Migration completed (columns already exist)!');
            process.exit(0);
        }

        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrateUsersAuth();
