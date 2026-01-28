import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
    id: text('id').primaryKey(), // Firebase UID
    email: text('email').notNull().unique(),
    name: text('name').notNull(),
    avatarUrl: text('avatar_url'),
    userRole: text('user_role', { enum: ['user', 'admin'] }).notNull().default('user'),
    subscriptionStatus: text('subscription_status', { enum: ['free', 'premium'] }).notNull().default('free'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const categories = sqliteTable('categories', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    icon: text('icon'),
    color: text('color'),
});

export const topics = sqliteTable('topics', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    hashtag: text('hashtag').notNull().unique(),
    articleCount: integer('article_count').notNull().default(0),
    trendingScore: integer('trending_score').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
    trendingIdx: index('topics_trending_idx').on(table.trendingScore),
}));

export const rss_sources = sqliteTable('rss_sources', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    countryCode: text('country_code').notNull(),
    sourceName: text('source_name').notNull(),
    sourceLogoUrl: text('source_logo_url').notNull(),
    rssUrl: text('rss_url'),
    apiEndpoint: text('api_endpoint'),
    apiKey: text('api_key'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    scrapeIntervalMinutes: integer('scrape_interval_minutes').notNull().default(30),
    biasScoreSystem: real('bias_score_system'),
    biasScoreUser: real('bias_score_user'),
    biasVoteCount: integer('bias_vote_count').notNull().default(0),
    // Government alignment columns for editorial transparency
    govAlignmentScore: integer('gov_alignment_score').notNull().default(0),
    govAlignmentLabel: text('gov_alignment_label'),
    govAlignmentConfidence: real('gov_alignment_confidence').default(0.7),
    govAlignmentNotes: text('gov_alignment_notes'),
    govAlignmentLastUpdated: integer('gov_alignment_last_updated', { mode: 'timestamp' }),
}, (table) => ({
    countryIdx: index('rss_sources_country_idx').on(table.countryCode),
    activeIdx: index('rss_sources_active_idx').on(table.isActive),
}));

// Source alignment history for audit trail
export const sourceAlignmentHistory = sqliteTable('source_alignment_history', {
    id: text('id').primaryKey(),
    sourceId: integer('source_id').notNull().references(() => rss_sources.id),
    oldScore: integer('old_score'),
    newScore: integer('new_score').notNull(),
    oldLabel: text('old_label'),
    newLabel: text('new_label'),
    reason: text('reason').notNull(),
    updatedBy: text('updated_by', { enum: ['admin', 'ai', 'user_vote'] }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
    sourceIdx: index('source_alignment_history_source_idx').on(table.sourceId),
    dateIdx: index('source_alignment_history_date_idx').on(table.updatedAt),
}));

// Article perspectives matching cache
export const articlePerspectives = sqliteTable('article_perspectives', {
    id: text('id').primaryKey(),
    mainArticleId: text('main_article_id').notNull(),
    relatedArticleId: text('related_article_id').notNull(),
    similarityScore: real('similarity_score').notNull(),
    matchedEntities: text('matched_entities', { mode: 'json' }), // JSON array of matched entities
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
    mainIdx: index('article_perspectives_main_idx').on(table.mainArticleId),
    uniquePair: index('article_perspectives_unique_pair').on(table.mainArticleId, table.relatedArticleId),
}));

// User source alignment votes
export const sourceVotes = sqliteTable('source_votes', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id),
    sourceId: integer('source_id').notNull().references(() => rss_sources.id),
    score: integer('score').notNull(), // -5 to +5
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
    userSourceIdx: index('source_votes_user_source_idx').on(table.userId, table.sourceId),
}));

// User subscriptions for premium
export const subscriptions = sqliteTable('subscriptions', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id),
    planId: text('plan_id', { enum: ['monthly', 'yearly'] }).notNull(),
    status: text('status', { enum: ['active', 'cancelled', 'expired'] }).notNull(),
    provider: text('provider', { enum: ['stripe', 'iyzico', 'apple', 'google'] }).notNull(),
    providerSubscriptionId: text('provider_subscription_id').notNull(),
    currentPeriodStart: integer('current_period_start', { mode: 'timestamp' }).notNull(),
    currentPeriodEnd: integer('current_period_end', { mode: 'timestamp' }),
    cancelAtPeriodEnd: integer('cancel_at_period_end', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
    userIdx: index('subscriptions_user_idx').on(table.userId),
    statusIdx: index('subscriptions_status_idx').on(table.status),
    providerIdx: index('subscriptions_provider_idx').on(table.providerSubscriptionId),
}));

// Payment history
export const payments = sqliteTable('payments', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id),
    subscriptionId: text('subscription_id').references(() => subscriptions.id),
    provider: text('provider', { enum: ['stripe', 'iyzico', 'apple', 'google'] }).notNull(),
    providerPaymentId: text('provider_payment_id').notNull(),
    amount: real('amount').notNull(),
    currency: text('currency').notNull().default('TRY'),
    status: text('status', { enum: ['succeeded', 'failed', 'pending', 'refunded'] }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
    userIdx: index('payments_user_idx').on(table.userId),
    subscriptionIdx: index('payments_subscription_idx').on(table.subscriptionId),
}));
