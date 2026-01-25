import 'dotenv/config';
import { db } from './src/config/db.js';
import { categories, tr_articles, rss_sources, tr_daily_digests } from './src/db/schema/index.js';

async function main() {
    console.log('=== FULL DATABASE CHECK ===');
    try {
        // Categories
        const cats = await db.select().from(categories);
        console.log(`\\n📁 Categories: ${cats.length}`);

        // RSS Sources
        const sources = await db.select().from(rss_sources);
        console.log(`📡 RSS Sources: ${sources.length}`);

        // Articles
        const arts = await db.select().from(tr_articles).limit(20);
        console.log(`📰 TR Articles: ${arts.length}`);
        if (arts.length > 0) {
            console.log('   Sample Article:', arts[0].translatedTitle);
        }

        // Digests
        const digests = await db.select().from(tr_daily_digests).limit(5);
        console.log(`📋 TR Daily Digests: ${digests.length}`);
        if (digests.length > 0) {
            console.log('   Last Digest Date:', digests[0].digestDate);
            console.log('   Summary Preview:', digests[0].summaryText?.substring(0, 100) + '...');
        }

        console.log('\\n=== CHECK COMPLETE ===');
    } catch (e) {
        console.error('Error:', e);
    }
}

main();
