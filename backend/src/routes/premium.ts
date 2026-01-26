import { Hono } from 'hono';

const premiumRoute = new Hono();

premiumRoute.get('/', (c) => {
    return c.json({
        success: true,
        data: {
            message: 'Premium features coming soon',
            plans: []
        }
    });
});

export default premiumRoute;
