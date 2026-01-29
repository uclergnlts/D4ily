/**
 * Backfill Script: Populate detail_content for existing articles
 * 
 * This script finds articles with null detail_content and generates
 * detail content using the existing summary and original_content.
 * 
 * Usage: npx tsx scripts/backfill-detail-content.ts [days] [country] [--dry-run]
 * Example: npx tsx scripts/backfill-detail-content.ts 30 tr
 * Example: npx tsx scripts/backfill-detail-content.ts 7 tr --dry-run
 */

import 'dotenv/config';
import { db } from '../src/config/db.js';
import { openai } from '../src/config/openai.js';
import { logger } from '../src/config/logger.js';
import { eq, isNull, and, gte } from 'drizzle-orm';
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

interface ArticleWithContent {
    id: string;
    summary: string;
    originalContent: string | null;
    translatedTitle: string;
}

/**
 * Generate detail content from summary and original content using OpenAI
 */
async function generateDetailContent(
    title: string,
    summary: string,
    originalContent: string | null
): Promise<string | null> {
    try {
        const content = originalContent || summary;
        
        const prompt = `Based on the following news article information, create a comprehensive, in-depth detail content (4-6 sentences) that expands on the summary. The detail content should provide context, background, and additional perspectives.

Title: ${title}
Summary: ${summary}
Original Content: ${content.substring(0, 1000)}

Requirements:
1. Write in Turkish
2. Must be DISTINCT from the summary (don't just repeat it)
3. Include context, implications, and background information
4. 4-6 sentences minimum
5. Professional news writing style

Return ONLY the detail content text, no additional formatting or explanations.`;

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'You are a professional Turkish news writer. Create detailed, informative content that expands on summaries.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            temperature: 0.4,
            max_tokens: 500,
        });

        const detailContent = response.choices[0].message.content?.trim() || null;
        
        if (!detailContent) {
            logger.warn({ title }, 'OpenAI returned empty detail content');
            return null;
        }

        // Basic validation: ensure it's different from summary
        if (detailContent.toLowerCase() === summary.toLowerCase()) {
            logger.warn({ title }, 'Generated detail content is identical to summary');
            return null;
        }

        return detailContent;
    } catch (error) {
        logger.error({ error, title }, 'Failed to generate detail content');
        return null;
    }
}

/**
 * Backfill articles for a specific country
 */
async function backfillCountry(
    country: CountryCode, 
    days: number, 
    dryRun: boolean
): Promise<{ processed: number; success: number; failed: number; skipped: number }> {
    const table = COUNTRY_TABLES[country];
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    logger.info({ country, days, cutoffDate, dryRun }, 'Starting backfill for country');

    // Find articles with null detail_content within the date range
    const articles = await db
        .select({
            id: table.id,
            summary: table.summary,
            originalContent: table.originalContent,
            translatedTitle: table.translatedTitle,
        })
        .from(table)
        .where(
            and(
                isNull(table.detailContent),
                gte(table.publishedAt, cutoffDate)
            )
        )
        .limit(100) as ArticleWithContent[];

    logger.info({ country, count: articles.length, dryRun }, `Found articles to backfill${dryRun ? ' (DRY RUN - no changes will be made)' : ''}`);

    let success = 0;
    let failed = 0;
    let skipped = 0;

    for (const article of articles) {
        try {
            const detailContent = await generateDetailContent(
                article.translatedTitle,
                article.summary,
                article.originalContent
            );

            if (detailContent) {
                if (dryRun) {
                    // In dry-run mode, just log what would happen
                    logger.info({ 
                        articleId: article.id, 
                        country, 
                        summaryLength: article.summary.length,
                        detailContentLength: detailContent.length 
                    }, '[DRY RUN] Would backfill detail content');
                    skipped++;
                } else {
                    await db
                        .update(table)
                        .set({ detailContent })
                        .where(eq(table.id, article.id));

                    success++;
                    logger.info({ articleId: article.id, country }, 'Backfilled detail content');
                }
            } else {
                failed++;
                logger.warn({ articleId: article.id, country }, 'Failed to generate detail content');
            }

            // Rate limiting - be nice to OpenAI
            await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
            failed++;
            logger.error({ error, articleId: article.id, country }, 'Error backfilling article');
        }
    }

    return { processed: articles.length, success, failed, skipped };
}

/**
 * Main execution
 */
async function main() {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    
    // Remove --dry-run from args for parsing
    const nonFlagArgs = args.filter(arg => arg !== '--dry-run');
    const days = parseInt(nonFlagArgs[0]) || 30;
    const specificCountry = nonFlagArgs[1] as CountryCode | undefined;

    logger.info({ days, specificCountry, dryRun }, 'Starting detail_content backfill');

    const countries: CountryCode[] = specificCountry 
        ? [specificCountry]
        : ['tr', 'de', 'us', 'uk', 'fr', 'es', 'it', 'ru'];

    const results: Record<string, { processed: number; success: number; failed: number; skipped: number }> = {};

    for (const country of countries) {
        try {
            results[country] = await backfillCountry(country, days, dryRun);
        } catch (error) {
            logger.error({ error, country }, 'Failed to backfill country');
            results[country] = { processed: 0, success: 0, failed: 0, skipped: 0 };
        }
    }

    // Summary
    logger.info({ results, dryRun }, 'Backfill completed');
    
    const totalProcessed = Object.values(results).reduce((sum, r) => sum + r.processed, 0);
    const totalSuccess = Object.values(results).reduce((sum, r) => sum + r.success, 0);
    const totalFailed = Object.values(results).reduce((sum, r) => sum + r.failed, 0);
    const totalSkipped = Object.values(results).reduce((sum, r) => sum + r.skipped, 0);

    console.log(`\n=== Backfill Summary ${dryRun ? '(DRY RUN)' : ''} ===`);
    console.log(`Total processed: ${totalProcessed}`);
    if (dryRun) {
        console.log(`Total would be updated: ${totalSkipped}`);
    } else {
        console.log(`Total success: ${totalSuccess}`);
    }
    console.log(`Total failed: ${totalFailed}`);
    
    for (const [country, result] of Object.entries(results)) {
        if (dryRun) {
            console.log(`${country}: ${result.skipped}/${result.processed} would be updated`);
        } else {
            console.log(`${country}: ${result.success}/${result.processed} succeeded`);
        }
    }

    process.exit(0);
}

main().catch((error) => {
    logger.error({ error }, 'Backfill script failed');
    process.exit(1);
});
