import { sqliteTable, text, integer, real, unique, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { users } from './global';

export const weeklyComparisons = sqliteTable('weekly_comparisons', {
    id: text('id').primaryKey(),
    weekStart: text('week_start').notNull(),
    weekEnd: text('week_end').notNull(),
    countriesData: text('countries_data', { mode: 'json' }).notNull(),
    comparisonText: text('comparison_text').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    commentCount: integer('comment_count').notNull().default(0),
});

export const comments = sqliteTable('comments', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    targetType: text('target_type', { enum: ['article', 'daily_digest', 'weekly_comparison'] }).notNull(),
    targetId: text('target_id').notNull(),
    countryCode: text('country_code'),
    content: text('content').notNull(),
    parentCommentId: text('parent_comment_id'),
    likeCount: integer('like_count').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }),
}, (table) => ({
    targetIdx: index('comments_target_idx').on(table.targetType, table.targetId),
    userIdx: index('comments_user_idx').on(table.userId),
    parentIdx: index('comments_parent_idx').on(table.parentCommentId),
}));

export const userFollowedSources = sqliteTable('user_followed_sources', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    sourceId: integer('source_id').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
    unique: unique().on(table.userId, table.sourceId),
    userIdx: index('user_followed_sources_user_idx').on(table.userId),
}));

export const articleReactions = sqliteTable('article_reactions', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    articleId: text('article_id').notNull(),
    countryCode: text('country_code').notNull(),
    reactionType: text('reaction_type', { enum: ['like', 'dislike'] }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
    unique: unique().on(table.userId, table.articleId, table.countryCode),
    userIdx: index('article_reactions_user_idx').on(table.userId),
    articleIdx: index('article_reactions_article_idx').on(table.articleId, table.countryCode),
}));

export const sourceBiasVotes = sqliteTable('source_bias_votes', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    sourceId: integer('source_id').notNull(),
    score: integer('score').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
    unique: unique().on(table.userId, table.sourceId),
    userIdx: index('source_bias_votes_user_idx').on(table.userId),
}));

export const userDevices = sqliteTable('user_devices', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    fcmToken: text('fcm_token').notNull(),
    deviceType: text('device_type', { enum: ['ios', 'android'] }).notNull(),
    deviceName: text('device_name'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    lastActive: integer('last_active', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
    userIdx: index('user_devices_user_idx').on(table.userId),
}));

export const userNotificationPreferences = sqliteTable('user_notification_preferences', {
    userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
    notifFollowedSources: integer('notif_followed_sources', { mode: 'boolean' }).notNull().default(true),
    notifDailyDigest: integer('notif_daily_digest', { mode: 'boolean' }).notNull().default(true),
    notifWeeklyComparison: integer('notif_weekly_comparison', { mode: 'boolean' }).notNull().default(true),
    notifBreakingNews: integer('notif_breaking_news', { mode: 'boolean' }).notNull().default(true),
    notifComments: integer('notif_comments', { mode: 'boolean' }).notNull().default(true),
    notifAlignmentChanges: integer('notif_alignment_changes', { mode: 'boolean' }).notNull().default(true),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const userCategoryPreferences = sqliteTable('user_category_preferences', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    categoryId: integer('category_id').notNull(),
}, (table) => ({
    unique: unique().on(table.userId, table.categoryId),
    userIdx: index('user_category_prefs_user_idx').on(table.userId),
}));

export const notifications = sqliteTable('notifications', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    type: text('type', { enum: ['news', 'digest', 'weekly', 'breaking', 'comment', 'alignment'] }).notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    data: text('data', { mode: 'json' }),
    isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
    sentAt: integer('sent_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
    userIdx: index('notifications_user_idx').on(table.userId),
    readIdx: index('notifications_read_idx').on(table.isRead),
}));

export const pollVotes = sqliteTable('poll_votes', {
    id: text('id').primaryKey(),
    pollId: text('poll_id').notNull(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    optionIndex: integer('option_index').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
    pollIdx: index('poll_votes_poll_idx').on(table.pollId),
}));

export const commentLikes = sqliteTable('comment_likes', {
    id: text('id').primaryKey(),
    commentId: text('comment_id').notNull().references(() => comments.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
    unique: unique().on(table.commentId, table.userId),
    commentIdx: index('comment_likes_comment_idx').on(table.commentId),
    userIdx: index('comment_likes_user_idx').on(table.userId),
}));

export const bookmarks = sqliteTable('bookmarks', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    articleId: text('article_id').notNull(),
    countryCode: text('country_code').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
    unique: unique().on(table.userId, table.articleId),
    userIdx: index('bookmarks_user_idx').on(table.userId),
    articleIdx: index('bookmarks_article_idx').on(table.articleId),
}));

export const readingHistory = sqliteTable('reading_history', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    articleId: text('article_id').notNull(),
    countryCode: text('country_code').notNull(),
    viewedAt: integer('viewed_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    timeSpentSeconds: integer('time_spent_seconds').default(0),
}, (table) => ({
    userIdx: index('reading_history_user_idx').on(table.userId),
    articleIdx: index('reading_history_article_idx').on(table.articleId),
    viewedAtIdx: index('reading_history_viewed_at_idx').on(table.viewedAt),
}));

// Source alignment votes - Users can vote on alignment accuracy
export const sourceAlignmentVotes = sqliteTable('source_alignment_votes', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    sourceId: integer('source_id').notNull(),
    voteType: text('vote_type', { enum: ['agree', 'disagree', 'unsure'] }).notNull(),
    suggestedScore: integer('suggested_score'),  // -5 to +5, optional suggestion
    comment: text('comment'),  // Optional feedback
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
}, (table) => ({
    unique: unique().on(table.userId, table.sourceId),
    userIdx: index('source_alignment_votes_user_idx').on(table.userId),
    sourceIdx: index('source_alignment_votes_source_idx').on(table.sourceId),
}));

// User alignment reputation - Track user voting accuracy
export const userAlignmentReputation = sqliteTable('user_alignment_reputation', {
    userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
    totalVotes: integer('total_votes').notNull().default(0),
    accurateVotes: integer('accurate_votes').notNull().default(0),  // Votes that matched eventual admin decision
    reputationScore: real('reputation_score').notNull().default(0.5),  // 0-1 score
    lastVoteAt: integer('last_vote_at', { mode: 'timestamp' }),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// Pending alignment notifications - Queue for alignment change notifications
export const pendingAlignmentNotifications = sqliteTable('pending_alignment_notifications', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    sourceId: integer('source_id').notNull(),
    sourceName: text('source_name').notNull(),
    oldScore: integer('old_score'),
    newScore: integer('new_score').notNull(),
    oldLabel: text('old_label'),
    newLabel: text('new_label'),
    changeReason: text('change_reason'),
    status: text('status', { enum: ['pending', 'sent', 'failed'] }).notNull().default('pending'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    sentAt: integer('sent_at', { mode: 'timestamp' }),
}, (table) => ({
    userIdx: index('pending_alignment_notif_user_idx').on(table.userId),
    statusIdx: index('pending_alignment_notif_status_idx').on(table.status),
    sourceIdx: index('pending_alignment_notif_source_idx').on(table.sourceId),
}));
