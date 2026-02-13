import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from './config/logger';
import { env } from './config/env';
import { apiLimiter } from './middleware/rateLimit';
import { aiTimeout, defaultTimeout } from './middleware/timeout';
import { startScraperCron } from './cron/scraperCron';
import { startDigestCron } from './cron/digestCron';
import { startWeeklyCron } from './cron/weeklyCron';
import { startAlignmentNotificationCron } from './cron/alignmentNotificationCron';
import { startTweetCron } from './cron/tweetCron';

// Import routes
import categoriesRoute from './routes/categories';
import sourcesRoute from './routes/sources';
import adminRoute from './routes/admin';
import commentsRoute from './routes/comments';
import authRoute from './routes/auth';
import reactionRoute from './routes/reactions';
import userRoute from './routes/user';
import notificationsRoute from './routes/notifications';
import digestRoute from './routes/digest';
import weeklyRoute from './routes/weekly';
import pollsRoute from './routes/polls';
import topicsRoute from './routes/topics';
import searchRoute from './routes/search';
import premiumRoute from './routes/premium';
import historyRoute from './routes/history';
import webhookRoute from './routes/webhooks';
import ciiRoute from './routes/cii';

const app = new Hono();

// CORS Middleware
app.use('*', cors({
    origin: (origin) => {
        if (env.NODE_ENV === 'production') {
            return origin === 'https://admin.d4ily.com' ? origin : null;
        }
        return origin || '*';
    },
    credentials: true,
}));

// Rate Limiting
app.use('/api/*', apiLimiter);

// Request logging
app.use('*', async (c, next) => {
    const start = Date.now();
    await next();
    const duration = Date.now() - start;

    logger.info({
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        duration,
    });
});

// Routes
app.get('/', (c) => {
    return c.json({
        message: 'News Platform API',
        version: '1.0.0',
        status: 'ok',
        endpoints: {
            health: '/health',
            categories: '/categories',
            sources: '/sources',
            digest: '/digest/:country',
            admin: '/admin',
        }
    });
});

app.get('/health', (c) => {
    return c.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

// Apply timeout middleware to specific routes
// AI-heavy routes - 30 second timeout
app.use('/digest/*', aiTimeout);
app.use('/weekly/*', aiTimeout);

// Default timeout for other API routes - 60 seconds
app.use('/admin/*', defaultTimeout);
app.use('/search/*', defaultTimeout);

// API Routes
app.route('/categories', categoriesRoute);
app.route('/sources', sourcesRoute);
app.route('/admin', adminRoute);
app.route('/comments', commentsRoute);
app.route('/auth', authRoute);
app.route('/reactions', reactionRoute);
app.route('/user', userRoute);
app.route('/notifications', notificationsRoute);
app.route('/digest', digestRoute);
app.route('/weekly', weeklyRoute);
app.route('/polls', pollsRoute);
app.route('/topics', topicsRoute);
app.route('/search', searchRoute);
app.route('/premium', premiumRoute);
app.route('/history', historyRoute);
app.route('/webhooks', webhookRoute);
app.route('/cii', ciiRoute);

// DEV-ONLY: Manual trigger endpoints (no auth required)
if (env.NODE_ENV !== 'production') {
    const { triggerDigestManually } = await import('./cron/digestCron');
    const { runScraper } = await import('./cron/scraperCron');

    app.post('/dev/scrape', async (c) => {
        logger.info('DEV: Manual scraper trigger (background)');
        // Run in background, don't block the response
        runScraper().then(() => {
            logger.info('DEV: Scraper completed in background');
        }).catch((err) => {
            logger.error({ error: err }, 'DEV: Scraper failed in background');
        });
        return c.json({ success: true, message: 'Scraper started in background' });
    });

    app.post('/dev/digest', async (c) => {
        const body = await c.req.json().catch(() => ({}));
        const period = body.period || 'evening';
        logger.info({ period }, 'DEV: Manual digest trigger');
        const result = await triggerDigestManually(period);
        return c.json({ success: true, data: result });
    });

    logger.info('DEV endpoints enabled: POST /dev/scrape, POST /dev/digest');
}

// Ops: manual scraper/digest triggers
app.post('/ops/scrape', async (c) => {
    const { runScraper } = await import('./cron/scraperCron.js');
    logger.info('OPS: Manual scraper trigger');
    runScraper().then(() => {
        logger.info('OPS: Scraper completed');
    }).catch((err) => {
        logger.error({ error: err }, 'OPS: Scraper failed');
    });
    return c.json({ success: true, message: 'Scraper started in background' });
});

app.post('/ops/digest', async (c) => {
    const { triggerDigestManually } = await import('./cron/digestCron.js');
    const body = await c.req.json().catch(() => ({}));
    const period = (body as any).period || 'evening';
    logger.info({ period }, 'OPS: Manual digest trigger');
    triggerDigestManually(period).then((result) => {
        logger.info({ result }, 'OPS: Digest completed');
    }).catch((err) => {
        logger.error({ error: err }, 'OPS: Digest failed');
    });
    return c.json({ success: true, message: `Digest (${period}) started in background` });
});

// Temporary migration endpoint — remove after running once in production
app.post('/ops/migrate-tweets', async (c) => {
    const { db: database } = await import('./config/db.js');
    const { sql: rawSql } = await import('drizzle-orm');
    const results: string[] = [];
    try {
        // Create twitter_accounts table
        await database.run(rawSql`CREATE TABLE IF NOT EXISTS twitter_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            country_code TEXT NOT NULL,
            user_name TEXT NOT NULL,
            display_name TEXT NOT NULL,
            account_type TEXT NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 1,
            description TEXT,
            gov_alignment_score INTEGER NOT NULL DEFAULT 0,
            last_fetched_at INTEGER
        )`);
        results.push('twitter_accounts created');

        // Create indexes for twitter_accounts
        await database.run(rawSql`CREATE INDEX IF NOT EXISTS twitter_accounts_country_idx ON twitter_accounts(country_code)`);
        await database.run(rawSql`CREATE INDEX IF NOT EXISTS twitter_accounts_active_idx ON twitter_accounts(is_active)`);
        results.push('twitter_accounts indexes created');

        // Create tweet tables for each country
        const countries = ['tr', 'de', 'us', 'uk', 'fr', 'es', 'it', 'ru'];
        for (const cc of countries) {
            await database.run(rawSql.raw(`CREATE TABLE IF NOT EXISTS ${cc}_tweets (
                id TEXT PRIMARY KEY,
                account_id INTEGER NOT NULL,
                user_name TEXT NOT NULL,
                display_name TEXT NOT NULL,
                text TEXT NOT NULL,
                lang TEXT,
                like_count INTEGER NOT NULL DEFAULT 0,
                retweet_count INTEGER NOT NULL DEFAULT 0,
                reply_count INTEGER NOT NULL DEFAULT 0,
                view_count INTEGER NOT NULL DEFAULT 0,
                tweeted_at INTEGER NOT NULL,
                fetched_at INTEGER NOT NULL DEFAULT (unixepoch()),
                used_in_digest INTEGER NOT NULL DEFAULT 0
            )`));
            results.push(`${cc}_tweets created`);

            await database.run(rawSql.raw(`CREATE INDEX IF NOT EXISTS ${cc}_tweets_tweeted_idx ON ${cc}_tweets(tweeted_at)`));
            await database.run(rawSql.raw(`CREATE INDEX IF NOT EXISTS ${cc}_tweets_account_idx ON ${cc}_tweets(account_id)`));
            results.push(`${cc}_tweets indexes created`);

            // Add tweet_count column to digest tables
            try {
                await database.run(rawSql.raw(`ALTER TABLE ${cc}_daily_digests ADD COLUMN tweet_count INTEGER NOT NULL DEFAULT 0`));
                results.push(`${cc}_daily_digests.tweet_count added`);
            } catch {
                results.push(`${cc}_daily_digests.tweet_count already exists`);
            }
        }

        return c.json({ success: true, results });
    } catch (error) {
        return c.json({ success: false, error: String(error), results }, 500);
    }
});

app.post('/ops/tweets', async (c) => {
    const { scrapeAllTwitterAccounts } = await import('./services/scraper/tweetScraperService.js');
    logger.info('OPS: Manual tweet scraper trigger');
    scrapeAllTwitterAccounts().then(() => {
        logger.info('OPS: Tweet scraping completed');
    }).catch((err) => {
        logger.error({ error: err }, 'OPS: Tweet scraping failed');
    });
    return c.json({ success: true, message: 'Tweet scraper started in background' });
});

// Start cron jobs
if (env.NODE_ENV !== 'test') {
    startScraperCron();
    startDigestCron();
    startTweetCron();
    startWeeklyCron();
    startAlignmentNotificationCron();
}

// Start server
const port = parseInt(env.PORT);

console.log(`🚀 Server is running on http://localhost:${port}`);
console.log(`📚 API Documentation: http://localhost:${port}/`);
console.log(`⏰ Scraper cron job active (every 30 minutes)`);
console.log(`🔔 Alignment notification cron job active (every 5 minutes)`);

serve({
    fetch: app.fetch,
    port,
    hostname: '0.0.0.0'
});
