import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/config/logger.js', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

import { CircuitBreaker } from '@/utils/circuitBreaker.js';

describe('CircuitBreaker', () => {
    let cb: CircuitBreaker;

    beforeEach(() => {
        vi.clearAllMocks();
        cb = new CircuitBreaker({ failureThreshold: 3, resetTimeout: 100, halfOpenMaxCalls: 2 });
    });

    describe('CLOSED state (default)', () => {
        it('should start in CLOSED state', () => {
            expect(cb.getState('test')).toBe('CLOSED');
        });

        it('should execute function and return result when healthy', async () => {
            const result = await cb.execute('test', async () => 42);
            expect(result).toBe(42);
        });

        it('should propagate errors without opening circuit below threshold', async () => {
            const fn = vi.fn().mockRejectedValue(new Error('fail'));

            await expect(cb.execute('test', fn)).rejects.toThrow('fail');
            await expect(cb.execute('test', fn)).rejects.toThrow('fail');

            // Still closed after 2 failures (threshold is 3)
            expect(cb.getState('test')).toBe('CLOSED');
        });
    });

    describe('CLOSED → OPEN transition', () => {
        it('should open circuit after failureThreshold failures', async () => {
            const fn = vi.fn().mockRejectedValue(new Error('fail'));

            for (let i = 0; i < 3; i++) {
                await expect(cb.execute('test', fn)).rejects.toThrow();
            }

            expect(cb.getState('test')).toBe('OPEN');
        });

        it('should use fallback when circuit opens', async () => {
            const fn = vi.fn().mockRejectedValue(new Error('fail'));
            const fallback = vi.fn().mockReturnValue('fallback-value');

            for (let i = 0; i < 3; i++) {
                await cb.execute('test', fn, fallback);
            }

            // Next call should use fallback (circuit open)
            const result = await cb.execute('test', fn, fallback);
            expect(result).toBe('fallback-value');
        });

        it('should throw when circuit is OPEN and no fallback provided', async () => {
            const fn = vi.fn().mockRejectedValue(new Error('fail'));

            for (let i = 0; i < 3; i++) {
                await expect(cb.execute('test', fn)).rejects.toThrow();
            }

            await expect(cb.execute('test', fn)).rejects.toThrow('Circuit breaker is OPEN');
        });
    });

    describe('OPEN → HALF_OPEN transition', () => {
        it('should enter HALF_OPEN after resetTimeout', async () => {
            const fn = vi.fn().mockRejectedValue(new Error('fail'));

            // Open the circuit
            for (let i = 0; i < 3; i++) {
                await expect(cb.execute('test', fn)).rejects.toThrow();
            }
            expect(cb.getState('test')).toBe('OPEN');

            // Wait for reset timeout
            await new Promise(resolve => setTimeout(resolve, 150));

            // Execute with a success to trigger half-open
            fn.mockResolvedValueOnce('ok');
            const result = await cb.execute('test', fn);
            expect(result).toBe('ok');
            expect(cb.getState('test')).toBe('CLOSED');
        });
    });

    describe('HALF_OPEN state', () => {
        async function openThenWait(circuit: CircuitBreaker) {
            const fn = vi.fn().mockRejectedValue(new Error('fail'));
            for (let i = 0; i < 3; i++) {
                await expect(circuit.execute('test', fn)).rejects.toThrow();
            }
            await new Promise(resolve => setTimeout(resolve, 150));
        }

        it('should close circuit on success in HALF_OPEN', async () => {
            await openThenWait(cb);

            // Success in half-open → CLOSED
            await cb.execute('test', async () => 'ok');
            expect(cb.getState('test')).toBe('CLOSED');
        });

        it('should enforce halfOpenMaxCalls limit', async () => {
            await openThenWait(cb);

            const fn = vi.fn().mockRejectedValue(new Error('still failing'));

            // halfOpenMaxCalls = 2: first 2 calls proceed (and fail, re-open)
            await expect(cb.execute('test', fn)).rejects.toThrow();
            // After first failure in half-open, circuit might re-open
            // After maxCalls exceeded, fallback should be used
            const fallback = vi.fn().mockReturnValue('fallback');
            await openThenWait(cb);

            for (let i = 0; i < 3; i++) {
                await cb.execute('test', fn, fallback);
            }

            // Now limit reached: fallback used
            const result = await cb.execute('test', fn, fallback);
            expect(result).toBe('fallback');
        });
    });

    describe('reset()', () => {
        it('should manually reset an open circuit to CLOSED', async () => {
            const fn = vi.fn().mockRejectedValue(new Error('fail'));

            for (let i = 0; i < 3; i++) {
                await expect(cb.execute('test', fn)).rejects.toThrow();
            }
            expect(cb.getState('test')).toBe('OPEN');

            cb.reset('test');
            expect(cb.getState('test')).toBe('CLOSED');
        });
    });

    describe('getAllMetrics()', () => {
        it('should return metrics for all tracked circuits', async () => {
            await cb.execute('circuit-a', async () => 'ok');
            const fn = vi.fn().mockRejectedValue(new Error('fail'));
            await expect(cb.execute('circuit-b', fn)).rejects.toThrow();

            const metrics = cb.getAllMetrics();
            expect(metrics['circuit-a']).toBeDefined();
            expect(metrics['circuit-b']).toBeDefined();
            expect(metrics['circuit-a'].successes).toBe(1);
            expect(metrics['circuit-b'].failures).toBe(1);
        });
    });

    describe('independent circuits', () => {
        it('should track state independently per circuit name', async () => {
            const fn = vi.fn().mockRejectedValue(new Error('fail'));

            for (let i = 0; i < 3; i++) {
                await expect(cb.execute('circuit-x', fn)).rejects.toThrow();
            }

            expect(cb.getState('circuit-x')).toBe('OPEN');
            expect(cb.getState('circuit-y')).toBe('CLOSED'); // unrelated circuit
        });
    });
});
