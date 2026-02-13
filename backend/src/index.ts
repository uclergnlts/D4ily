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

app.post('/ops/seed-twitter', async (c) => {
    const { db: database } = await import('./config/db.js');
    const { sql: rawSql } = await import('drizzle-orm');
    const accounts = [
        // Turkey
        { id: 1, cc: 'tr', un: 'RTErdogan', dn: 'Recep Tayyip Erdogan', at: 'government', desc: 'Cumhurbaskani' },
        { id: 2, cc: 'tr', un: 'tcbaskanlik', dn: 'T.C. Cumhurbaskanligi', at: 'government', desc: 'Cumhurbaskanligi resmi hesabi' },
        { id: 3, cc: 'tr', un: 'TC_Disisleri', dn: 'TC Disisleri Bakanligi', at: 'government', desc: 'Disisleri Bakanligi' },
        { id: 4, cc: 'tr', un: 'iaborakisim', dn: 'Iletisim Baskanligi', at: 'government', desc: 'Cumhurbaskanligi Iletisim Baskanligi' },
        { id: 5, cc: 'tr', un: 'aaborakans', dn: 'Anadolu Ajansi', at: 'news_agency', desc: 'Resmi haber ajansi' },
        { id: 6, cc: 'tr', un: 'AnadoluAgency', dn: 'Anadolu Agency', at: 'news_agency', desc: 'Anadolu Agency EN' },
        { id: 7, cc: 'tr', un: 'trthaber', dn: 'TRT Haber', at: 'news_agency', desc: 'TRT devlet yayin kurumu' },
        // Germany
        { id: 8, cc: 'de', un: 'Bundeskanzler', dn: 'Bundeskanzler', at: 'government', desc: 'Federal Chancellor' },
        { id: 9, cc: 'de', un: 'AusijirtigesAmt', dn: 'Auswaertiges Amt', at: 'government', desc: 'Federal Foreign Office' },
        { id: 10, cc: 'de', un: 'RegSprecher', dn: 'Regierungssprecher', at: 'government', desc: 'Government Spokesperson' },
        { id: 11, cc: 'de', un: 'taborakesschau', dn: 'tagesschau', at: 'news_agency', desc: 'ARD public news' },
        { id: 12, cc: 'de', un: 'ZDFheute', dn: 'ZDFheute', at: 'news_agency', desc: 'ZDF public broadcaster' },
        { id: 13, cc: 'de', un: 'dpa', dn: 'dpa', at: 'news_agency', desc: 'Deutsche Presse-Agentur' },
        // US
        { id: 14, cc: 'us', un: 'POTUS', dn: 'President of the United States', at: 'government', desc: 'US President official' },
        { id: 15, cc: 'us', un: 'WhiteHouse', dn: 'The White House', at: 'government', desc: 'White House official' },
        { id: 16, cc: 'us', un: 'StateDept', dn: 'Department of State', at: 'government', desc: 'US State Department' },
        { id: 17, cc: 'us', un: 'AP', dn: 'The Associated Press', at: 'news_agency', desc: 'AP wire service' },
        { id: 18, cc: 'us', un: 'Reuters', dn: 'Reuters', at: 'news_agency', desc: 'Reuters news wire' },
        { id: 19, cc: 'us', un: 'ABC', dn: 'ABC News', at: 'news_agency', desc: 'ABC News' },
        // UK
        { id: 20, cc: 'uk', un: 'UKPrimeMinister', dn: 'UK Prime Minister', at: 'government', desc: 'PM official' },
        { id: 21, cc: 'uk', un: '10DowningStreet', dn: '10 Downing Street', at: 'government', desc: 'PM office' },
        { id: 22, cc: 'uk', un: 'FCDOGovUK', dn: 'FCDO', at: 'government', desc: 'Foreign Commonwealth & Development Office' },
        { id: 23, cc: 'uk', un: 'BBCNews', dn: 'BBC News', at: 'news_agency', desc: 'BBC News' },
        { id: 24, cc: 'uk', un: 'SkyNews', dn: 'Sky News', at: 'news_agency', desc: 'Sky News' },
        // France
        { id: 25, cc: 'fr', un: 'EmmanuelMacron', dn: 'Emmanuel Macron', at: 'government', desc: 'President of France' },
        { id: 26, cc: 'fr', un: 'Elysee', dn: 'Elysee', at: 'government', desc: 'French Presidency' },
        { id: 27, cc: 'fr', un: 'francediplo', dn: 'France Diplomatie', at: 'government', desc: 'Ministry of Foreign Affairs' },
        { id: 28, cc: 'fr', un: 'gouvernementFR', dn: 'Gouvernement', at: 'government', desc: 'French Government' },
        { id: 29, cc: 'fr', un: 'AFP', dn: 'AFP', at: 'news_agency', desc: 'Agence France-Presse' },
        { id: 30, cc: 'fr', un: 'lemondefr', dn: 'Le Monde', at: 'news_agency', desc: 'Le Monde newspaper' },
        // Spain
        { id: 31, cc: 'es', un: 'saboraknchezcastejon', dn: 'Pedro Sanchez', at: 'government', desc: 'President of the Government' },
        { id: 32, cc: 'es', un: 'lamoncloa', dn: 'La Moncloa', at: 'government', desc: 'Spanish Government' },
        { id: 33, cc: 'es', un: 'MAECgob', dn: 'MAEC', at: 'government', desc: 'Ministry of Foreign Affairs' },
        { id: 34, cc: 'es', un: 'EFEnoticias', dn: 'Agencia EFE', at: 'news_agency', desc: 'EFE national news agency' },
        { id: 35, cc: 'es', un: 'el_pais', dn: 'El Pais', at: 'news_agency', desc: 'El Pais newspaper' },
        // Italy
        { id: 36, cc: 'it', un: 'GiorgiaMeloni', dn: 'Giorgia Meloni', at: 'government', desc: 'Prime Minister of Italy' },
        { id: 37, cc: 'it', un: 'PalazzoChigi', dn: 'Palazzo Chigi', at: 'government', desc: 'Italian Government' },
        { id: 38, cc: 'it', un: 'ItalyMFA', dn: 'Italy MFA', at: 'government', desc: 'Ministry of Foreign Affairs' },
        { id: 39, cc: 'it', un: 'Agenzia_Ansa', dn: 'ANSA', at: 'news_agency', desc: 'ANSA news agency' },
        { id: 40, cc: 'it', un: 'repubblica', dn: 'la Repubblica', at: 'news_agency', desc: 'la Repubblica newspaper' },
        // Russia
        { id: 41, cc: 'ru', un: 'KremlinRussia_E', dn: 'President of Russia', at: 'government', desc: 'Kremlin English-language' },
        { id: 42, cc: 'ru', un: 'mfa_russia', dn: 'MFA Russia', at: 'government', desc: 'Ministry of Foreign Affairs EN' },
        { id: 43, cc: 'ru', un: 'tass_agency', dn: 'TASS', at: 'news_agency', desc: 'TASS Russian News Agency' },
    ];
    const results: string[] = [];
    try {
        for (const a of accounts) {
            await database.run(rawSql`INSERT OR IGNORE INTO twitter_accounts (id, country_code, user_name, display_name, account_type, is_active, description, gov_alignment_score) VALUES (${a.id}, ${a.cc}, ${a.un}, ${a.dn}, ${a.at}, 1, ${a.desc}, 0)`);
        }
        results.push(`${accounts.length} accounts inserted (or already exist)`);
        // Count
        const count = await database.get<{ cnt: number }>(rawSql`SELECT COUNT(*) as cnt FROM twitter_accounts`);
        results.push(`Total accounts in DB: ${count?.cnt ?? 'unknown'}`);
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
