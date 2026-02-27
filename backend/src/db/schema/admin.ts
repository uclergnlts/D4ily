import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// User activity logs for audit trail
export const userActivityLogs = sqliteTable('user_activity_logs', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    action: text('action').notNull(), // 'login', 'logout', 'article_read', 'comment', 'vote', etc.
    entityType: text('entity_type'), // 'article', 'comment', 'source', etc.
    entityId: text('entity_id'),
    metadata: text('metadata'), // JSON string for additional data
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`unixepoch()`),
});

// Banned/Suspended users
export const userBans = sqliteTable('user_bans', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    reason: text('reason').notNull(),
    bannedBy: text('banned_by').notNull(), // Admin user ID
    bannedAt: integer('banned_at', { mode: 'timestamp' }).notNull().default(sql`unixepoch()`),
    expiresAt: integer('expires_at', { mode: 'timestamp' }), // NULL = permanent
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    unbannedAt: integer('unbanned_at', { mode: 'timestamp' }),
    unbannedBy: text('unbanned_by'),
});

// Content moderation - blacklisted words
export const blacklistedWords = sqliteTable('blacklisted_words', {
    id: text('id').primaryKey(),
    word: text('word').notNull().unique(),
    category: text('category').notNull().default('general'), // 'spam', 'hate_speech', 'misinformation', etc.
    severity: text('severity').notNull().default('medium'), // 'low', 'medium', 'high', 'critical'
    action: text('action').notNull().default('flag'), // 'flag', 'block', 'replace'
    replacement: text('replacement'), // For 'replace' action
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdBy: text('created_by').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`unixepoch()`),
});

// Push notification campaigns
export const notificationCampaigns = sqliteTable('notification_campaigns', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    data: text('data'), // JSON for additional payload
    targetAudience: text('target_audience').notNull().default('all'), // 'all', 'premium', 'free', 'country:tr', etc.
    scheduledAt: integer('scheduled_at', { mode: 'timestamp' }),
    sentAt: integer('sent_at', { mode: 'timestamp' }),
    status: text('status').notNull().default('draft'), // 'draft', 'scheduled', 'sending', 'sent', 'failed'
    sentCount: integer('sent_count').notNull().default(0),
    deliveredCount: integer('delivered_count').notNull().default(0),
    openedCount: integer('opened_count').notNull().default(0),
    createdBy: text('created_by').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`unixepoch()`),
});

// Daily analytics snapshots
export const analyticsSnapshots = sqliteTable('analytics_snapshots', {
    id: text('id').primaryKey(),
    date: text('date').notNull().unique(), // YYYY-MM-DD
    totalUsers: integer('total_users').notNull().default(0),
    activeUsers: integer('active_users').notNull().default(0),
    newUsers: integer('new_users').notNull().default(0),
    premiumUsers: integer('premium_users').notNull().default(0),
    totalArticles: integer('total_articles').notNull().default(0),
    newArticles: integer('new_articles').notNull().default(0),
    totalSessions: integer('total_sessions').notNull().default(0),
    avgSessionDuration: real('avg_session_duration').default(0),
    retentionD1: real('retention_d1').default(0), // Day 1 retention
    retentionD7: real('retention_d7').default(0), // Day 7 retention
    retentionD30: real('retention_d30').default(0), // Day 30 retention
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`unixepoch()`),
});

// Content moderation queue
export const moderationQueue = sqliteTable('moderation_queue', {
    id: text('id').primaryKey(),
    contentType: text('content_type').notNull(), // 'article', 'comment'
    contentId: text('content_id').notNull(),
    flaggedBy: text('flagged_by'), // User ID or 'system'
    flagReason: text('flag_reason').notNull(),
    severity: text('severity').notNull().default('medium'), // 'low', 'medium', 'high'
    status: text('status').notNull().default('pending'), // 'pending', 'approved', 'rejected'
    reviewedBy: text('reviewed_by'),
    reviewedAt: integer('reviewed_at', { mode: 'timestamp' }),
    notes: text('notes'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`unixepoch()`),
});
