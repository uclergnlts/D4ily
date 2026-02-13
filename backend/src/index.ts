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

// Temporary debug endpoint — diagnose rss_sources query hang
app.get('/debug/db', async (c) => {
    const { createClient } = await import('@libsql/client');
    const results: Record<string, unknown> = {};
    const rawClient = createClient({
        url: env.TURSO_DATABASE_URL,
        ...(env.TURSO_DATABASE_URL.startsWith('file:') ? {} : { authToken: env.TURSO_AUTH_TOKEN }),
    });

    // Test 1: List tables
    try {
        const t0 = Date.now();
        const tables = await rawClient.execute("SELECT name FROM sqlite_master WHERE type='table'");
        results.tables = { data: tables.rows.map(r => r.name), ms: Date.now() - t0 };
    } catch (e: any) {
        results.tables = { error: e?.message || String(e) };
    }

    // Test 2: Raw SQL count on rss_sources
    try {
        const t0 = Date.now();
        const count = await rawClient.execute('SELECT count(*) as cnt FROM rss_sources');
        results.rss_sources_count = { data: count.rows[0], ms: Date.now() - t0 };
    } catch (e: any) {
        results.rss_sources_count = { error: e?.message || String(e) };
    }

    // Test 3: Raw SQL select rows
    try {
        const t0 = Date.now();
        const row = await rawClient.execute('SELECT id, source_name, country_code, is_active FROM rss_sources LIMIT 3');
        results.rss_sources_sample = { data: row.rows, ms: Date.now() - t0 };
    } catch (e: any) {
        results.rss_sources_sample = { error: e?.message || String(e) };
    }

    // Test 4: Drizzle ORM query (with 5s timeout)
    try {
        const { db } = await import('./config/db.js');
        const { rss_sources } = await import('./db/schema/index.js');
        const { eq } = await import('drizzle-orm');
        const t0 = Date.now();
        const drizzleResult = await Promise.race([
            db.select({ id: rss_sources.id, name: rss_sources.sourceName }).from(rss_sources).where(eq(rss_sources.isActive, true)).limit(3),
            new Promise<'TIMEOUT'>((resolve) => setTimeout(() => resolve('TIMEOUT'), 5000)),
        ]);
        results.drizzle_query = { data: drizzleResult, ms: Date.now() - t0 };
    } catch (e: any) {
        results.drizzle_query = { error: e?.message || String(e) };
    }

    // Test 5: country_digests count (working reference)
    try {
        const t0 = Date.now();
        const count = await rawClient.execute('SELECT count(*) as cnt FROM country_digests');
        results.country_digests_count = { data: count.rows[0], ms: Date.now() - t0 };
    } catch (e: any) {
        results.country_digests_count = { error: e?.message || String(e) };
    }

    // Test 6: Raw SQL INSERT into tr_articles
    const testId = 'test_' + Date.now();
    try {
        const t0 = Date.now();
        await rawClient.execute({
            sql: `INSERT INTO tr_articles (id, original_title, original_content, original_language, translated_title, summary, detail_content, image_url, is_clickbait, is_ad, is_filtered, source_count, sentiment, political_tone, political_confidence, government_mentioned, emotional_tone, emotional_intensity, loaded_language_score, sensationalism_score, category_id, published_at, scraped_at, view_count, like_count, dislike_count, comment_count)
                  VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 0, 0, 0, 1, 'neutral', 0, 0.0, 0, NULL, 0.0, 0.0, 0.0, 8, ?, ?, 0, 0, 0, 0)`,
            args: [testId, 'Test Article', 'Test content', 'tr', 'Test Article', 'Test summary', 'Test detail', Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000)],
        });
        results.raw_insert = { success: true, ms: Date.now() - t0 };
        // Clean up
        await rawClient.execute({ sql: 'DELETE FROM tr_articles WHERE id = ?', args: [testId] });
    } catch (e: any) {
        results.raw_insert = { error: e?.message || String(e), code: e?.code };
    }

    // Test 7: Drizzle INSERT into tr_articles
    const testId2 = 'test2_' + Date.now();
    try {
        const { db } = await import('./config/db.js');
        const { tr_articles } = await import('./db/schema/index.js');
        const t0 = Date.now();
        await db.insert(tr_articles).values({
            id: testId2,
            originalTitle: 'Test Article Drizzle',
            originalContent: 'Test content',
            originalLanguage: 'tr',
            translatedTitle: 'Test Article Drizzle',
            summary: 'Test summary',
            detailContent: 'Test detail',
            isClickbait: false,
            isAd: false,
            isFiltered: false,
            sourceCount: 1,
            sentiment: 'neutral',
            politicalTone: 0,
            politicalConfidence: 0,
            governmentMentioned: false,
            emotionalTone: null,
            emotionalIntensity: 0,
            loadedLanguageScore: 0,
            sensationalismScore: 0,
            categoryId: 8,
            publishedAt: new Date(),
            scrapedAt: new Date(),
            viewCount: 0,
            likeCount: 0,
            dislikeCount: 0,
            commentCount: 0,
        });
        results.drizzle_insert = { success: true, ms: Date.now() - t0 };
        // Clean up
        await rawClient.execute({ sql: 'DELETE FROM tr_articles WHERE id = ?', args: [testId2] });
    } catch (e: any) {
        results.drizzle_insert = { error: e?.message || String(e), code: e?.code };
    }

    return c.json({ debug: results, libsql_url: env.TURSO_DATABASE_URL.substring(0, 30) + '...' });
});

// Temporary: manual triggers (will remove after debugging)
app.post('/debug/scrape', async (c) => {
    const { runScraper } = await import('./cron/scraperCron.js');
    logger.info('DEBUG: Manual scraper trigger');
    runScraper().then(() => {
        logger.info('DEBUG: Scraper completed');
    }).catch((err) => {
        logger.error({ error: err }, 'DEBUG: Scraper failed');
    });
    return c.json({ success: true, message: 'Scraper started in background' });
});

app.post('/debug/digest', async (c) => {
    const { triggerDigestManually } = await import('./cron/digestCron.js');
    const body = await c.req.json().catch(() => ({}));
    const period = (body as any).period || 'evening';
    logger.info({ period }, 'DEBUG: Manual digest trigger');
    triggerDigestManually(period).then((result) => {
        logger.info({ result }, 'DEBUG: Digest completed');
    }).catch((err) => {
        logger.error({ error: err }, 'DEBUG: Digest failed');
    });
    return c.json({ success: true, message: `Digest (${period}) started in background` });
});

// Start cron jobs
if (env.NODE_ENV !== 'test') {
    startScraperCron();
    startDigestCron();
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
