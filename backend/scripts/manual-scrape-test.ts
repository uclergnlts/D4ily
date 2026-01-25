
import 'dotenv/config';
import { runScraper } from '../src/cron/scraperCron.js';
import { logger } from '../src/config/logger.js';

// Determine execution mode
const mode = process.argv[2];

async function main() {
    logger.info('Starting manual scraper test...');
    try {
        await runScraper();
        logger.info('Manual scraper test completed successfully.');
    } catch (error) {
        logger.error({ error }, 'Manual scraper test failed.');
    }
    process.exit(0);
}

main();
