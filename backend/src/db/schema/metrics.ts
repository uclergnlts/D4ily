/**
 * AI Usage Metrics Tracking
 * 
 * Tables and utilities for observability of AI costs and performance
 */

import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

/**
 * Daily AI usage metrics table
 */
export const aiUsageMetrics = sqliteTable('ai_usage_metrics', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    date: text('date').notNull(),  // YYYY-MM-DD

    // Call counts
    totalCalls: integer('total_calls').notNull().default(0),
    successfulCalls: integer('successful_calls').notNull().default(0),
    failedCalls: integer('failed_calls').notNull().default(0),
    fallbackCalls: integer('fallback_calls').notNull().default(0),

    // Token usage (estimated)
    totalInputTokens: integer('total_input_tokens').notNull().default(0),
    totalOutputTokens: integer('total_output_tokens').notNull().default(0),
    estimatedCostUsd: real('estimated_cost_usd').notNull().default(0),

    // Political tone stats
    articlesWithGovMention: integer('articles_with_gov_mention').notNull().default(0),
    avgPoliticalConfidence: real('avg_political_confidence').notNull().default(0),

    // Score distribution
    scoreDistribution: text('score_distribution', { mode: 'json' }), // JSON object

    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
    dateIdx: index('ai_usage_metrics_date_idx').on(table.date),
}));

/**
 * Scraper deduplication cache
 * Prevents re-processing same content
 */
export const scraperDedup = sqliteTable('scraper_dedup', {
    hash: text('hash').primaryKey(),  // SHA256(title + domain + published_date)
    articleId: text('article_id'),    // If processed, the resulting article ID
    processedAt: integer('processed_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),  // 48 hours from creation
}, (table) => ({
    expiresIdx: index('scraper_dedup_expires_idx').on(table.expiresAt),
}));

// Export schema
export type AIUsageMetrics = typeof aiUsageMetrics.$inferSelect;
export type ScraperDedup = typeof scraperDedup.$inferSelect;
