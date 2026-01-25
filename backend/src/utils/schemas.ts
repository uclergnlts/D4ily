import { z } from 'zod';

// Country validation
export const countrySchema = z.enum(['tr', 'de', 'us', 'uk', 'fr', 'es', 'it', 'jp', 'kr', 'ru']);

// Query params schemas
export const paginationSchema = z.object({
    page: z.string().regex(/^\d+$/).transform(Number).default('1'),
    limit: z.string().regex(/^\d+$/).transform(Number).default('20'),
});

export const countryQuerySchema = z.object({
    country: countrySchema.optional(),
});

// ID validation
export const uuidSchema = z.string().uuid();

// Bias score validation
export const biasScoreSchema = z.object({
    score: z.number().min(1).max(10),
});
