import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from './config/logger';
import { env } from './config/env';
import { apiLimiter } from './middleware/rateLimit';
import { feedTimeout, aiTimeout, defaultTimeout } from './middleware/timeout';
import { startScraperCron } from './cron/scraperCron';
import { startDigestCron } from './cron/digestCron';
import { startWeeklyCron } from './cron/weeklyCron';
import { startAlignmentNotificationCron } from './cron/alignmentNotificationCron';

// Import routes
import categoriesRoute from './routes/categories';
import sourcesRoute from './routes/sources';
import feedRoute from './routes/feed';
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

// Apply timeout middleware to specific routes
// Feed routes - 10 second timeout
app.use('/feed/*', feedTimeout);

// AI-heavy routes - 30 second timeout
app.use('/digest/*', aiTimeout);
app.use('/weekly/*', aiTimeout);

// Default timeout for other API routes - 60 seconds
app.use('/admin/*', defaultTimeout);
app.use('/search/*', defaultTimeout);

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
app.route('/premium', premiumRoute);
app.route('/history', historyRoute);
app.route('/webhooks', webhookRoute);

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
