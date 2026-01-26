import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';

const historyRoute = new Hono();

historyRoute.get('/', authMiddleware, (c) => {
    return c.json({
        success: true,
        data: []
    });
});

export default historyRoute;
