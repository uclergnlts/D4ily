import 'dotenv/config';
import { db } from './src/config/db.js';
import { rss_sources } from './src/db/schema/index.js';
import { eq } from 'drizzle-orm';
import { scrapeSource } from './src/services/scraper/scraperService.js';

async function main() {
    console.log('Starting Manual Scrape...');
    const sources = await db.select().from(rss_sources).where(eq(rss_sources.isActive, true));
    console.log(`Found ${sources.length} active sources.`);

    for (const source of sources) {
        if (!source.rssUrl) continue;
        console.log(`Scraping ${source.sourceName}...`);
        try {
            const result = await scrapeSource(
                source.id,
                source.sourceName,
                source.sourceLogoUrl,
                source.rssUrl,
                source.countryCode as 'tr' | 'de' | 'us'
            );
            console.log(`Result: ${JSON.stringify(result)}`);
        } catch (err) {
            console.error(`Failed ${source.sourceName}:`, err);
        }
    }
    console.log('Done.');
    process.exit(0);
}
main();
