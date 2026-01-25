import 'dotenv/config';
import { db } from './config/db.js';
import { rss_sources } from './db/schema/index.js';
import { eq } from 'drizzle-orm';
import { scrapeSource } from './services/scraper/scraperService.js';
import { logger } from './config/logger.js';

async function testScraper() {
    console.log('🧪 Testing RSS Scraper with OpenAI...\n');

    try {
        // Get one Turkish source for testing
        const sources = await db
            .select()
            .from(rss_sources)
            .where(eq(rss_sources.countryCode, 'tr'))
            .limit(1);

        if (sources.length === 0) {
            console.error('❌ No Turkish sources found');
            process.exit(1);
        }

        const source = sources[0];
        console.log(`📰 Testing with: ${source.sourceName}`);
        console.log(`🔗 URL: ${source.rssUrl}\n`);

        if (!source.rssUrl) {
            console.error('❌ Source has no RSS URL');
            process.exit(1);
        }

        const result = await scrapeSource(
            source.id,
            source.sourceName,
            source.sourceLogoUrl,
            source.rssUrl,
            'tr'
        );

        console.log('\n✅ Scrape test completed!');
        console.log(`   Processed: ${result.processed}`);
        console.log(`   Duplicates: ${result.duplicates}`);
        console.log(`   Filtered: ${result.filtered}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

testScraper();
