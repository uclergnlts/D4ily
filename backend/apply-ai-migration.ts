import 'dotenv/config';
import { createClient } from '@libsql/client';

const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
});

// Migration statements from 0004_perpetual_madelyne_pryor.sql
const migrations = [
    `ALTER TABLE tr_articles ADD COLUMN political_tone integer DEFAULT 0`,
    `ALTER TABLE tr_articles ADD COLUMN political_confidence real DEFAULT 0`,
    `ALTER TABLE tr_articles ADD COLUMN government_mentioned integer DEFAULT 0`,
    `ALTER TABLE tr_articles ADD COLUMN emotional_tone text`,
    `ALTER TABLE tr_articles ADD COLUMN emotional_intensity real`,
    `ALTER TABLE tr_articles ADD COLUMN loaded_language_score real`,
    `ALTER TABLE tr_articles ADD COLUMN sensationalism_score real`,

    `ALTER TABLE de_articles ADD COLUMN political_tone integer DEFAULT 0`,
    `ALTER TABLE de_articles ADD COLUMN political_confidence real DEFAULT 0`,
    `ALTER TABLE de_articles ADD COLUMN government_mentioned integer DEFAULT 0`,
    `ALTER TABLE de_articles ADD COLUMN emotional_tone text`,
    `ALTER TABLE de_articles ADD COLUMN emotional_intensity real`,
    `ALTER TABLE de_articles ADD COLUMN loaded_language_score real`,
    `ALTER TABLE de_articles ADD COLUMN sensationalism_score real`,

    `ALTER TABLE us_articles ADD COLUMN political_tone integer DEFAULT 0`,
    `ALTER TABLE us_articles ADD COLUMN political_confidence real DEFAULT 0`,
    `ALTER TABLE us_articles ADD COLUMN government_mentioned integer DEFAULT 0`,
    `ALTER TABLE us_articles ADD COLUMN emotional_tone text`,
    `ALTER TABLE us_articles ADD COLUMN emotional_intensity real`,
    `ALTER TABLE us_articles ADD COLUMN loaded_language_score real`,
    `ALTER TABLE us_articles ADD COLUMN sensationalism_score real`,
];

async function runMigrations() {
    console.log('🚀 Starting AI Fields Migration...');

    for (const sql of migrations) {
        try {
            await client.execute(sql);
            console.log(`✅ ${sql.substring(0, 60)}...`);
        } catch (error: any) {
            // Ignore "duplicate column" errors
            if (error.message?.includes('duplicate column') || error.message?.includes('already exists')) {
                console.log(`⏭️  Column already exists: ${sql.substring(0, 40)}...`);
            } else {
                console.error(`❌ Failed: ${sql}`);
                console.error(error.message);
            }
        }
    }

    console.log('\\n🎉 Migration completed!');
    process.exit(0);
}

runMigrations();
