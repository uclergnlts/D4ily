import 'dotenv/config';
import { db } from './config/db.js';
import { redis } from './config/redis.js';
import { categories, rss_sources } from './db/schema/index.js';
import { logger } from './config/logger.js';

async function testConnections() {
    console.log('🧪 Testing all connections...\n');

    // Test 1: Database (Turso)
    try {
        const categoriesCount = await db.select().from(categories);
        console.log(`✅ Database (Turso): Connected - ${categoriesCount.length} categories found`);
    } catch (error) {
        console.error('❌ Database (Turso): Failed', error);
    }

    // Test 2: Redis (Upstash)
    try {
        await redis.set('test-key', 'test-value', { ex: 10 });
        const value = await redis.get('test-key');
        if (value === 'test-value') {
            console.log('✅ Redis (Upstash): Connected - Read/Write OK');
        } else {
            console.error('❌ Redis: Write/Read mismatch');
        }
    } catch (error) {
        console.error('❌ Redis (Upstash): Failed', error);
    }

    // Test 3: RSS Sources Query
    try {
        const sources = await db.select().from(rss_sources);
        console.log(`✅ RSS Sources: ${sources.length} sources loaded`);

        const groupedByCountry = sources.reduce((acc, s) => {
            acc[s.countryCode] = (acc[s.countryCode] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        console.log('   Sources by country:', groupedByCountry);
    } catch (error) {
        console.error('❌ RSS Sources Query: Failed', error);
    }

    // Test 4: Logger
    try {
        logger.info('Test log message');
        console.log('✅ Logger (Pino): Working');
    } catch (error) {
        console.error('❌ Logger: Failed', error);
    }

    console.log('\n✨ Connection tests completed!');
    process.exit(0);
}

testConnections().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
