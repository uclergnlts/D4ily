import { Hono } from 'hono';
import { z } from 'zod';
import { logger } from '../config/logger.js';
import { calculateCII, getCIIForAllCountries } from '../services/ciiService.js';

const ciiRoute = new Hono();

const countrySchema = z.enum(['tr', 'de', 'us', 'uk', 'fr', 'es', 'it', 'ru']);

// Simple in-memory cache (30 minutes)
let allCIICache: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * GET /cii
 * Get CII scores for all countries (cached 30 min)
 */
ciiRoute.get('/', async (c) => {
    try {
        const now = Date.now();

        if (allCIICache && (now - allCIICache.timestamp) < CACHE_TTL) {
            return c.json({ success: true, data: allCIICache.data, cached: true });
        }

        const results = await getCIIForAllCountries();
        allCIICache = { data: results, timestamp: now };

        return c.json({ success: true, data: results });
    } catch (error) {
        logger.error({ error }, 'Get all CII failed');
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to calculate CII',
        }, 500);
    }
});

/**
 * GET /cii/:country
 * Get CII score for a specific country
 */
ciiRoute.get('/:country', async (c) => {
    try {
        const { country } = c.req.param();
        const validatedCountry = countrySchema.parse(country) as 'tr' | 'de' | 'us' | 'uk' | 'fr' | 'es' | 'it' | 'ru';

        const result = await calculateCII(validatedCountry);

        return c.json({ success: true, data: result });
    } catch (error) {
        logger.error({ error }, 'Get CII failed');
        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to calculate CII',
        }, 500);
    }
});

export default ciiRoute;
