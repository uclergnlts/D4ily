import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rateLimiter, apiRateLimiter, authRateLimiter } from '../../src/middleware/rateLimiter.js';

describe('Rate Limiter', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('rateLimiter', () => {
        it('should allow requests under the limit', async () => {
            const mockNext = vi.fn();
            const mockContext = {
                req: {
                    header: vi.fn().mockReturnValue('127.0.0.1'),
                },
                get: vi.fn().mockReturnValue(undefined),
                header: vi.fn(),
                json: vi.fn(),
            };

            const limiter = rateLimiter({ windowMs: 60000, max: 5 });
            await limiter(mockContext as any, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });

        it('should set correct rate limit headers', async () => {
            const mockNext = vi.fn();
            const mockHeader = vi.fn();
            const mockContext = {
                req: {
                    header: vi.fn().mockReturnValue('127.0.0.1'),
                },
                get: vi.fn().mockReturnValue(undefined),
                header: mockHeader,
                json: vi.fn(),
            };

            const limiter = rateLimiter({ windowMs: 60000, max: 5 });
            await limiter(mockContext as any, mockNext);

            expect(mockHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '5');
            expect(mockHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', '4');
        });
    });

    describe('pre-configured limiters', () => {
        it('should export apiRateLimiter', () => {
            expect(apiRateLimiter).toBeDefined();
            expect(typeof apiRateLimiter).toBe('function');
        });

        it('should export authRateLimiter', () => {
            expect(authRateLimiter).toBeDefined();
            expect(typeof authRateLimiter).toBe('function');
        });
    });
});
