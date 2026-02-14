import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Helper function to create country-specific article table
export function createArticleTable(countryCode: string) {
    const tableName = `${countryCode}_articles`;

    return sqliteTable(tableName, {
        id: text('id').primaryKey(),
        originalTitle: text('original_title').notNull(),
        originalContent: text('original_content'),
        originalLanguage: text('original_language').notNull(),
        translatedTitle: text('translated_title').notNull(),
        summary: text('summary').notNull(),
        detailContent: text('detail_content'), // Full article content for detail view
        imageUrl: text('image_url'),
        isClickbait: integer('is_clickbait', { mode: 'boolean' }).notNull(),
        isAd: integer('is_ad', { mode: 'boolean' }).notNull(),
        isFiltered: integer('is_filtered', { mode: 'boolean' }).notNull(),
        sourceCount: integer('source_count').notNull().default(1),
        sentiment: text('sentiment', { enum: ['positive', 'neutral', 'negative'] }),
        // Political tone analysis (AI-generated per article)
        politicalTone: integer('political_tone').notNull().default(0),  // -5 to +5
        politicalConfidence: real('political_confidence').notNull().default(0),  // 0 to 1
        governmentMentioned: integer('government_mentioned', { mode: 'boolean' }).notNull().default(false),
        // Emotional analysis (AI-generated)
        emotionalTone: text('emotional_tone', { mode: 'json' }),  // JSON: {"anger": 0.2, "fear": 0.1, "joy": 0.0, "sadness": 0.3, "surprise": 0.1}
        emotionalIntensity: real('emotional_intensity'),  // 0-1
        loadedLanguageScore: real('loaded_language_score'),  // 0-1 (yönlü dil)
        sensationalismScore: real('sensationalism_score'),  // 0-1 (sansasyonellik)
        categoryId: integer('category_id'),
        publishedAt: integer('published_at', { mode: 'timestamp' }).notNull(),
        scrapedAt: integer('scraped_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
        viewCount: integer('view_count').notNull().default(0),
        likeCount: integer('like_count').notNull().default(0),
        dislikeCount: integer('dislike_count').notNull().default(0),
        commentCount: integer('comment_count').notNull().default(0),
    }, (table) => ({
        publishedIdx: index(`${countryCode}_articles_published_idx`).on(table.publishedAt),
        categoryIdx: index(`${countryCode}_articles_category_idx`).on(table.categoryId),
        politicalToneIdx: index(`${countryCode}_articles_political_tone_idx`).on(table.politicalTone),
        // Critical composite index for feed queries: WHERE isFiltered = false ORDER BY publishedAt DESC
        isFilteredPublishedIdx: index(`${countryCode}_articles_filtered_published_idx`).on(table.isFiltered, table.publishedAt),
        // Index for source count queries
        sourceCountIdx: index(`${countryCode}_articles_source_count_idx`).on(table.sourceCount),
    }));
}

// Helper for article sources table
export function createArticleSourcesTable(countryCode: string) {
    const tableName = `${countryCode}_article_sources`;

    return sqliteTable(tableName, {
        id: text('id').primaryKey(), // Added to match DB
        articleId: text('article_id').notNull(),
        sourceName: text('source_name').notNull(),
        sourceLogoUrl: text('source_logo_url').notNull(),
        sourceUrl: text('source_url').notNull(),
        isPrimary: integer('is_primary', { mode: 'boolean' }).notNull().default(false),
        addedAt: integer('added_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    });
}

// Helper for article topics table
export function createArticleTopicsTable(countryCode: string) {
    const tableName = `${countryCode}_article_topics`;

    return sqliteTable(tableName, {
        articleId: text('article_id').notNull(),
        topicId: integer('topic_id').notNull(),
    });
}

// Helper for article polls table
export function createArticlePollsTable(countryCode: string) {
    const tableName = `${countryCode}_article_polls`;

    return sqliteTable(tableName, {
        id: text('id').primaryKey(),
        articleId: text('article_id').notNull(),
        question: text('question').notNull(),
        options: text('options', { mode: 'json' }).notNull(), // JSON array
        results: text('results', { mode: 'json' }).notNull(), // JSON object
        totalVotes: integer('total_votes').notNull().default(0),
        expiresAt: integer('expires_at', { mode: 'timestamp' }),
        createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
    });
}

// Helper for daily digests table
export function createDailyDigestsTable(countryCode: string) {
    const tableName = `${countryCode}_daily_digests`;

    return sqliteTable(tableName, {
        id: text('id').primaryKey(),
        countryCode: text('country_code').notNull(),
        period: text('period', { enum: ['morning', 'evening'] }).notNull(),
        digestDate: text('digest_date').notNull(), // YYYY-MM-DD
        summaryText: text('summary_text').notNull(),
        topTopics: text('top_topics', { mode: 'json' }).notNull(),
        sections: text('sections', { mode: 'json' }), // Category-based digest sections (TR only for now)
        articleCount: integer('article_count').notNull(),
        tweetCount: integer('tweet_count').notNull().default(0),
        createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
        commentCount: integer('comment_count').notNull().default(0),
    });
}

// Helper for country-specific tweets table (from Twitter/X accounts)
export function createTweetsTable(countryCode: string) {
    const tableName = `${countryCode}_tweets`;

    return sqliteTable(tableName, {
        id: text('id').primaryKey(), // Tweet ID from Twitter API
        accountId: integer('account_id').notNull(),
        userName: text('user_name').notNull(),
        displayName: text('display_name').notNull(),
        text: text('text').notNull(),
        lang: text('lang'),
        likeCount: integer('like_count').notNull().default(0),
        retweetCount: integer('retweet_count').notNull().default(0),
        replyCount: integer('reply_count').notNull().default(0),
        viewCount: integer('view_count').notNull().default(0),
        tweetedAt: integer('tweeted_at', { mode: 'timestamp' }).notNull(),
        fetchedAt: integer('fetched_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
        usedInDigest: integer('used_in_digest', { mode: 'boolean' }).notNull().default(false),
    }, (table) => ({
        tweetedIdx: index(`${countryCode}_tweets_tweeted_idx`).on(table.tweetedAt),
        accountIdx: index(`${countryCode}_tweets_account_idx`).on(table.accountId),
    }));
}

// Create tables for initial countries
export const tr_articles = createArticleTable('tr');
export const tr_article_sources = createArticleSourcesTable('tr');
export const tr_article_topics = createArticleTopicsTable('tr');
export const tr_article_polls = createArticlePollsTable('tr');
export const tr_daily_digests = createDailyDigestsTable('tr');

export const de_articles = createArticleTable('de');
export const de_article_sources = createArticleSourcesTable('de');
export const de_article_topics = createArticleTopicsTable('de');
export const de_article_polls = createArticlePollsTable('de');
export const de_daily_digests = createDailyDigestsTable('de');

export const us_articles = createArticleTable('us');
export const us_article_sources = createArticleSourcesTable('us');
export const us_article_topics = createArticleTopicsTable('us');
export const us_article_polls = createArticlePollsTable('us');
export const us_daily_digests = createDailyDigestsTable('us');

export const uk_articles = createArticleTable('uk');
export const uk_article_sources = createArticleSourcesTable('uk');
export const uk_article_topics = createArticleTopicsTable('uk');
export const uk_article_polls = createArticlePollsTable('uk');
export const uk_daily_digests = createDailyDigestsTable('uk');

export const fr_articles = createArticleTable('fr');
export const fr_article_sources = createArticleSourcesTable('fr');
export const fr_article_topics = createArticleTopicsTable('fr');
export const fr_article_polls = createArticlePollsTable('fr');
export const fr_daily_digests = createDailyDigestsTable('fr');

export const es_articles = createArticleTable('es');
export const es_article_sources = createArticleSourcesTable('es');
export const es_article_topics = createArticleTopicsTable('es');
export const es_article_polls = createArticlePollsTable('es');
export const es_daily_digests = createDailyDigestsTable('es');

export const it_articles = createArticleTable('it');
export const it_article_sources = createArticleSourcesTable('it');
export const it_article_topics = createArticleTopicsTable('it');
export const it_article_polls = createArticlePollsTable('it');
export const it_daily_digests = createDailyDigestsTable('it');

export const ru_articles = createArticleTable('ru');
export const ru_article_sources = createArticleSourcesTable('ru');
export const ru_article_topics = createArticleTopicsTable('ru');
export const ru_article_polls = createArticlePollsTable('ru');
export const ru_daily_digests = createDailyDigestsTable('ru');

// Tweet tables per country
export const tr_tweets = createTweetsTable('tr');
export const de_tweets = createTweetsTable('de');
export const us_tweets = createTweetsTable('us');
export const uk_tweets = createTweetsTable('uk');
export const fr_tweets = createTweetsTable('fr');
export const es_tweets = createTweetsTable('es');
export const it_tweets = createTweetsTable('it');
export const ru_tweets = createTweetsTable('ru');
