import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from './config/logger.js';
import { env } from './config/env.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { startScraperCron } from './cron/scraperCron.js';
import { startDigestCron } from './cron/digestCron.js';
import { startWeeklyCron } from './cron/weeklyCron.js';
import { startAlignmentNotificationCron } from './cron/alignmentNotificationCron.js';

// Import routes
import categoriesRoute from './routes/categories.js';
import sourcesRoute from './routes/sources.js';
import feedRoute from './routes/feed.js';
import adminRoute from './routes/admin.js';
import commentsRoute from './routes/comments.js';
import authRoute from './routes/auth.js';
import reactionRoute from './routes/reactions.js';
import userRoute from './routes/user.js';
import notificationsRoute from './routes/notifications.js';
import digestRoute from './routes/digest.js';
import weeklyRoute from './routes/weekly.js';
import pollsRoute from './routes/polls.js';
import topicsRoute from './routes/topics.js';
import searchRoute from './routes/search.js';

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
            feed: '/feed/:country',
            article: '/feed/:country/:articleId',
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

// API Routes
app.route('/categories', categoriesRoute);
app.route('/sources', sourcesRoute);
app.route('/feed', feedRoute);
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
