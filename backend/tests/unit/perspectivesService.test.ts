import { describe, it, expect, vi } from 'vitest';

// Mock dependencies BEFORE importing the service
vi.mock('@/config/env.js', () => ({
    env: {
        NODE_ENV: 'test',
        PORT: '3333',
        LOG_LEVEL: 'info',
        TURSO_DATABASE_URL: 'libsql://test-db',
        TURSO_AUTH_TOKEN: 'test-token',
    }
}));

vi.mock('@/config/logger.js', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    }
}));

vi.mock('@/config/db.js', () => ({
    db: {
        select: vi.fn(),
        insert: vi.fn(),
        update: vi.fn(),
    }
}));

vi.mock('@/config/openai.js', () => ({
    openai: {
        chat: {
            completions: {
                create: vi.fn(),
            },
        },
        embeddings: {
            create: vi.fn(),
        },
    }
}));

import {
    calculateEntityOverlap,
    getCommonEntities,
    type ExtractedEntities,
} from '../../src/services/perspectivesService';

describe('Perspectives Service Utils', () => {
    describe('calculateEntityOverlap', () => {
        it('should return 1 for identical entity sets', () => {
            const entities1: ExtractedEntities = {
                persons: ['Erdoğan', 'Kılıçdaroğlu'],
                organizations: ['AKP', 'CHP'],
                locations: ['Ankara'],
                events: ['Seçim'],
            };

            const overlap = calculateEntityOverlap(entities1, entities1);
            expect(overlap).toBe(1);
        });

        it('should return 0 for completely different entity sets', () => {
            const entities1: ExtractedEntities = {
                persons: ['Erdoğan'],
                organizations: ['AKP'],
                locations: ['Ankara'],
                events: ['Seçim'],
            };

            const entities2: ExtractedEntities = {
                persons: ['Biden'],
                organizations: ['NATO'],
                locations: ['Washington'],
                events: ['Summit'],
            };

            const overlap = calculateEntityOverlap(entities1, entities2);
            expect(overlap).toBe(0);
        });

        it('should return partial overlap for shared entities', () => {
            const entities1: ExtractedEntities = {
                persons: ['Erdoğan', 'Biden'],
                organizations: ['NATO'],
                locations: ['Ankara'],
                events: [],
            };

            const entities2: ExtractedEntities = {
                persons: ['Biden'],
                organizations: ['NATO', 'UN'],
                locations: ['Washington'],
                events: [],
            };

            const overlap = calculateEntityOverlap(entities1, entities2);
            // Shared: Biden, NATO (2), Union: Erdoğan, Biden, NATO, Ankara, UN, Washington (6)
            expect(overlap).toBeCloseTo(2 / 6, 2);
        });

        it('should handle empty entity sets', () => {
            const empty: ExtractedEntities = {
                persons: [],
                organizations: [],
                locations: [],
                events: [],
            };

            const nonEmpty: ExtractedEntities = {
                persons: ['Erdoğan'],
                organizations: [],
                locations: [],
                events: [],
            };

            expect(calculateEntityOverlap(empty, nonEmpty)).toBe(0);
            expect(calculateEntityOverlap(nonEmpty, empty)).toBe(0);
            expect(calculateEntityOverlap(empty, empty)).toBe(0);
        });

        it('should be case insensitive', () => {
            const entities1: ExtractedEntities = {
                persons: ['ERDOGAN'],
                organizations: [],
                locations: [],
                events: [],
            };

            const entities2: ExtractedEntities = {
                persons: ['erdogan'],
                organizations: [],
                locations: [],
                events: [],
            };

            expect(calculateEntityOverlap(entities1, entities2)).toBe(1);
        });
    });

    describe('getCommonEntities', () => {
        it('should return common entities from both sets', () => {
            const entities1: ExtractedEntities = {
                persons: ['Erdoğan', 'Biden'],
                organizations: ['NATO'],
                locations: ['Ankara'],
                events: ['Summit'],
            };

            const entities2: ExtractedEntities = {
                persons: ['Biden', 'Putin'],
                organizations: ['NATO', 'UN'],
                locations: ['Moscow', 'Ankara'],
                events: ['Summit'],
            };

            const common = getCommonEntities(entities1, entities2);

            // Should contain Biden, NATO, Ankara, Summit
            expect(common).toContain('Biden');
            expect(common).toContain('NATO');
            expect(common).toContain('Ankara');
            expect(common).toContain('Summit');
            expect(common).not.toContain('Putin');
            expect(common).not.toContain('UN');
        });

        it('should return empty array when no common entities', () => {
            const entities1: ExtractedEntities = {
                persons: ['A'],
                organizations: [],
                locations: [],
                events: [],
            };

            const entities2: ExtractedEntities = {
                persons: ['B'],
                organizations: [],
                locations: [],
                events: [],
            };

            const common = getCommonEntities(entities1, entities2);
            expect(common).toHaveLength(0);
        });

        it('should be case insensitive', () => {
            const entities1: ExtractedEntities = {
                persons: ['BIDEN'],
                organizations: [],
                locations: [],
                events: [],
            };

            const entities2: ExtractedEntities = {
                persons: ['Biden'],
                organizations: [],
                locations: [],
                events: [],
            };

            const common = getCommonEntities(entities1, entities2);
            expect(common).toHaveLength(1);
        });
    });
});
