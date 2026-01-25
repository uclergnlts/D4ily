import 'dotenv/config';
import { db } from './src/config/db.js';
import { tr_articles } from './src/db/schema/index.js';
import { gte } from 'drizzle-orm';

async function test() {
    console.log('🧪 Testing database query...');

    try {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        console.log('Querying articles from:', oneDayAgo);

        const recentArticles = await db
            .select()
            .from(tr_articles)
            .where(gte(tr_articles.scrapedAt, oneDayAgo))
            .limit(10);

        console.log('✅ Found articles:', recentArticles.length);
        recentArticles.forEach(a => console.log(' -', a.originalTitle?.substring(0, 50)));
    } catch (error) {
        console.error('❌ Database Error:', error);
    }

    process.exit(0);
}

test();
