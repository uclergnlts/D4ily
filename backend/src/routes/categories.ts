import { Hono } from 'hono';
import { db } from '../config/db.js';
import { categories } from '../db/schema/index.js';
import { handleError } from '../utils/errors.js';
import type { ApiResponse, Category } from '../types/index.js';

const app = new Hono();

// GET /categories - Get all categories
app.get('/', async (c) => {
    try {
        const allCategories = await db.select().from(categories);

        const response: ApiResponse<Category[]> = {
            success: true,
            data: allCategories,
        };

        return c.json(response);
    } catch (error) {
        return handleError(c, error, 'Failed to fetch categories');
    }
});

export default app;
