import { Hono } from 'hono';
import { db } from '../config/db.js';
import {
    tr_tweets,
    de_tweets,
    us_tweets,
    uk_tweets,
    fr_tweets,
    es_tweets,
    it_tweets,
    ru_tweets,
} from '../db/schema/index.js';
import { desc } from 'drizzle-orm';
import { handleError } from '../utils/errors.js';
import { countrySchema, paginationSchema } from '../utils/schemas.js';
import { logger } from '../config/logger.js';

const TWEET_TABLES = {
    tr: tr_tweets,
    de: de_tweets,
    us: us_tweets,
    uk: uk_tweets,
    fr: fr_tweets,
    es: es_tweets,
    it: it_tweets,
    ru: ru_tweets,
} as const;

const app = new Hono();

// GET /tweets/:country - Paginated tweet listing
app.get('/:country', async (c) => {
    try {
        const countryParam = c.req.param('country');

        const countryValidation = countrySchema.safeParse(countryParam);
        if (!countryValidation.success) {
            return c.json({ success: false, error: 'Invalid country code' }, 400);
        }

        const country = countryValidation.data as keyof typeof TWEET_TABLES;
        const pageParam = c.req.query('page') || '1';
        const limitParam = c.req.query('limit') || '20';

        const paginationValidation = paginationSchema.safeParse({ page: pageParam, limit: limitParam });
        if (!paginationValidation.success) {
            return c.json({ success: false, error: 'Invalid pagination parameters' }, 400);
        }

        const { page, limit } = paginationValidation.data;
        const offset = (page - 1) * limit;

        const table = TWEET_TABLES[country];
        const tweets = await db
            .select({
                id: table.id,
                userName: table.userName,
                displayName: table.displayName,
                profileImageUrl: table.profileImageUrl,
                text: table.text,
                lang: table.lang,
                likeCount: table.likeCount,
                retweetCount: table.retweetCount,
                replyCount: table.replyCount,
                viewCount: table.viewCount,
                tweetedAt: table.tweetedAt,
            })
            .from(table)
            .orderBy(desc(table.tweetedAt))
            .limit(limit)
            .offset(offset);

        const result = {
            tweets,
            pagination: {
                page,
                limit,
                hasMore: tweets.length === limit,
            },
        };

        logger.info({ country, page, tweetCount: tweets.length }, 'Tweets fetched');

        const response = c.json({ success: true, data: result });
        response.headers.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=600');
        return response;
    } catch (error) {
        return handleError(c, error, 'Failed to fetch tweets');
    }
});

export default app;
