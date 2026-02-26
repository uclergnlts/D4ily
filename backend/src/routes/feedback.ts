import { Hono } from 'hono';
import { db } from '../config/db.js';
import { userFeedback } from '../db/schema/index.js';
import { desc } from 'drizzle-orm';
import { logger } from '../config/logger.js';
import { z } from 'zod';
import { optionalAuthMiddleware, adminMiddleware, AuthUser } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';
import { sanitizeInput } from '../utils/sanitize.js';
import { rateLimiter } from '../middleware/rateLimiter.js';

type Variables = { user: AuthUser };
const feedbackRoute = new Hono<{ Variables: Variables }>();

const feedbackSchema = z.object({
    type: z.enum(['istek', 'oneri', 'sikayet', 'genel']),
    content: z.string().min(5, 'En az 5 karakter yazmalisin').max(2000, 'Cok uzun'),
    email: z.string().email().optional().nullable(),
});

const feedbackRateLimiter = rateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 8,
    message: 'Cok fazla geri bildirim gonderildi. Lutfen daha sonra tekrar deneyin.',
});

/**
 * POST /feedback
 * Submit user feedback (auth optional - allows anonymous)
 */
feedbackRoute.post('/', optionalAuthMiddleware, feedbackRateLimiter, async (c) => {
    try {
        const user = c.get('user') as AuthUser | undefined;
        const userId = user?.uid || null;

        const body = await c.req.json();
        const validated = feedbackSchema.parse(body);

        const feedback = await db
            .insert(userFeedback)
            .values({
                id: uuidv4(),
                userId,
                type: validated.type,
                content: sanitizeInput(validated.content),
                email: validated.email || null,
                status: 'new',
                createdAt: new Date(),
            })
            .returning()
            .get();

        logger.info({ feedbackId: feedback.id, type: validated.type, userId }, 'User feedback submitted');

        return c.json({
            success: true,
            data: { id: feedback.id },
        }, 201);
    } catch (error) {
        logger.error({ error }, 'Submit feedback failed');
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Geri bildirim gonderilemedi',
        }, 400);
    }
});

/**
 * GET /feedback
 * List all feedback (admin only)
 */
feedbackRoute.get('/', adminMiddleware, async (c) => {
    try {
        const page = parseInt(c.req.query('page') ?? '1', 10);
        const limit = Math.min(parseInt(c.req.query('limit') ?? '50', 10), 100);
        const offset = (page - 1) * limit;

        const feedbacks = await db
            .select()
            .from(userFeedback)
            .orderBy(desc(userFeedback.createdAt))
            .limit(limit)
            .offset(offset);

        return c.json({
            success: true,
            data: feedbacks,
        });
    } catch (error) {
        logger.error({ error }, 'List feedback failed');
        return c.json({
            success: false,
            error: 'Failed to list feedback',
        }, 500);
    }
});

export default feedbackRoute;
