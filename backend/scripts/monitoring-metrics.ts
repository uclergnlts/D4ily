/**
 * Monitoring Metrics for detailContent Feature
 * 
 * Tracks:
 * 1. detailContent_null_rate - Percentage of articles with null detailContent in last 24h
 * 2. ai_duplicate_guard_rate - Percentage of articles that triggered AI fallback
 * 
 * Usage: npx tsx scripts/monitoring-metrics.ts [country]
 * Example: npx tsx scripts/monitoring-metrics.ts tr
 */

import 'dotenv/config';
import { db } from '../src/config/db.js';
import { logger } from '../src/config/logger.js';
import { sql } from 'drizzle-orm';
import {
    tr_articles,
    de_articles,
    us_articles,
    uk_articles,
    fr_articles,
    es_articles,
    it_articles,
    ru_articles,
} from '../src/db/schema/index.js';

const COUNTRY_TABLES = {
    tr: tr_articles,
    de: de_articles,
    us: us_articles,
    uk: uk_articles,
    fr: fr_articles,
    es: es_articles,
    it: it_articles,
    ru: ru_articles,
} as const;

type CountryCode = keyof typeof COUNTRY_TABLES;

interface MetricsResult {
    country: string;
    totalArticles24h: number;
    nullDetailContentCount: number;
    nullRate: number;
    aiDuplicateGuardTriggers: number;
    aiDuplicateGuardRate: number;
}

/**
 * Calculate metrics for a specific country
 */
async function calculateMetrics(country: CountryCode): Promise<MetricsResult> {
    const table = COUNTRY_TABLES[country];
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    logger.info({ country }, 'Calculating metrics');

    // Count total articles in last 24h
    const totalResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(table)
        .where(sql`${table.publishedAt} >= ${oneDayAgo.getTime() / 1000}`)
        .get();

    const totalArticles24h = totalResult?.count || 0;

    // Count articles with null detailContent in last 24h
    const nullResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(table)
        .where(sql`${table.publishedAt} >= ${oneDayAgo.getTime() / 1000} AND ${table.detailContent} IS NULL`)
        .get();

    const nullDetailContentCount = nullResult?.count || 0;
    const nullRate = totalArticles24h > 0 ? (nullDetailContentCount / totalArticles24h) * 100 : 0;

    // Note: ai_duplicate_guard_rate is tracked via logs
    // In production, this would be queried from a metrics store (e.g., Prometheus, CloudWatch)
    // For now, we return 0 and log a warning to implement proper metrics collection
    const aiDuplicateGuardTriggers = 0; // Placeholder
    const aiDuplicateGuardRate = 0; // Placeholder

    logger.warn({ country }, 'ai_duplicate_guard_rate requires log aggregation - implement metrics collection in production');

    return {
        country,
        totalArticles24h,
        nullDetailContentCount,
        nullRate,
        aiDuplicateGuardTriggers,
        aiDuplicateGuardRate,
    };
}

/**
 * Main execution
 */
async function main() {
    const args = process.argv.slice(2);
    const specificCountry = args[0] as CountryCode | undefined;

    logger.info({ specificCountry }, 'Starting metrics calculation');

    const countries: CountryCode[] = specificCountry 
        ? [specificCountry]
        : ['tr', 'de', 'us', 'uk', 'fr', 'es', 'it', 'ru'];

    const results: MetricsResult[] = [];

    for (const country of countries) {
        try {
            const metrics = await calculateMetrics(country);
            results.push(metrics);
        } catch (error) {
            logger.error({ error, country }, 'Failed to calculate metrics');
        }
    }

    // Output results
    console.log('\n=== detailContent Monitoring Metrics (Last 24h) ===\n');
    
    for (const result of results) {
        console.log(`Country: ${result.country.toUpperCase()}`);
        console.log(`  Total Articles: ${result.totalArticles24h}`);
        console.log(`  Null detailContent: ${result.nullDetailContentCount}`);
        console.log(`  Null Rate: ${result.nullRate.toFixed(2)}%`);
        
        if (result.nullRate > 50) {
            console.log(`  ⚠️  WARNING: High null rate! Consider running backfill script.`);
        }
        
        console.log('');
    }

    // Summary
    const totalNullRate = results.reduce((sum, r) => sum + r.nullRate, 0) / results.length;
    console.log(`Overall Average Null Rate: ${totalNullRate.toFixed(2)}%`);
    
    if (totalNullRate > 30) {
        console.log('\n⚠️  RECOMMENDATION: Overall null rate is high.');
        console.log('   Run: npx tsx scripts/backfill-detail-content.ts 7 --dry-run');
    }

    process.exit(0);
}

main().catch((error) => {
    logger.error({ error }, 'Metrics script failed');
    process.exit(1);
});
