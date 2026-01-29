import { logger } from '../config/logger.js';

interface CircuitBreakerOptions {
    failureThreshold: number;      // Number of failures before opening circuit
    resetTimeout: number;          // Time in ms before attempting reset
    halfOpenMaxCalls: number;      // Max calls in half-open state
}

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerMetrics {
    failures: number;
    successes: number;
    lastFailureTime: number | null;
    state: CircuitState;
    halfOpenCalls: number;
}

/**
 * Circuit Breaker pattern implementation
 * Prevents cascading failures when external services are down
 */
export class CircuitBreaker {
    private metrics: Map<string, CircuitBreakerMetrics> = new Map();
    private options: CircuitBreakerOptions;

    constructor(options: Partial<CircuitBreakerOptions> = {}) {
        this.options = {
            failureThreshold: options.failureThreshold || 5,
            resetTimeout: options.resetTimeout || 30000, // 30 seconds
            halfOpenMaxCalls: options.halfOpenMaxCalls || 3,
        };
    }

    /**
     * Execute a function with circuit breaker protection
     */
    async execute<T>(
        name: string,
        fn: () => Promise<T>,
        fallback?: () => T
    ): Promise<T> {
        const metrics = this.getMetrics(name);

        // Check if circuit is open
        if (metrics.state === 'OPEN') {
            if (this.shouldAttemptReset(metrics)) {
                metrics.state = 'HALF_OPEN';
                metrics.halfOpenCalls = 0;
                logger.info({ circuit: name }, 'Circuit breaker entering half-open state');
            } else {
                if (fallback) {
                    logger.warn({ circuit: name }, 'Circuit open, using fallback');
                    return fallback();
                }
                throw new Error(`Circuit breaker is OPEN for ${name}`);
            }
        }

        // Check half-open call limit
        if (metrics.state === 'HALF_OPEN' && metrics.halfOpenCalls >= this.options.halfOpenMaxCalls) {
            if (fallback) {
                return fallback();
            }
            throw new Error(`Circuit breaker half-open call limit reached for ${name}`);
        }

        if (metrics.state === 'HALF_OPEN') {
            metrics.halfOpenCalls++;
        }

        try {
            const result = await fn();
            this.onSuccess(name);
            return result;
        } catch (error) {
            this.onFailure(name);
            if (fallback) {
                return fallback();
            }
            throw error;
        }
    }

    private getMetrics(name: string): CircuitBreakerMetrics {
        if (!this.metrics.has(name)) {
            this.metrics.set(name, {
                failures: 0,
                successes: 0,
                lastFailureTime: null,
                state: 'CLOSED',
                halfOpenCalls: 0,
            });
        }
        return this.metrics.get(name)!;
    }

    private onSuccess(name: string): void {
        const metrics = this.getMetrics(name);
        metrics.successes++;

        if (metrics.state === 'HALF_OPEN') {
            metrics.state = 'CLOSED';
            metrics.failures = 0;
            metrics.halfOpenCalls = 0;
            logger.info({ circuit: name }, 'Circuit breaker closed');
        }
    }

    private onFailure(name: string): void {
        const metrics = this.getMetrics(name);
        metrics.failures++;
        metrics.lastFailureTime = Date.now();

        if (metrics.failures >= this.options.failureThreshold) {
            metrics.state = 'OPEN';
            logger.error({ 
                circuit: name, 
                failures: metrics.failures 
            }, 'Circuit breaker opened');
        }
    }

    private shouldAttemptReset(metrics: CircuitBreakerMetrics): boolean {
        if (!metrics.lastFailureTime) return true;
        return Date.now() - metrics.lastFailureTime >= this.options.resetTimeout;
    }

    /**
     * Get current state of a circuit
     */
    getState(name: string): CircuitState {
        return this.getMetrics(name).state;
    }

    /**
     * Manually reset a circuit
     */
    reset(name: string): void {
        this.metrics.set(name, {
            failures: 0,
            successes: 0,
            lastFailureTime: null,
            state: 'CLOSED',
            halfOpenCalls: 0,
        });
        logger.info({ circuit: name }, 'Circuit breaker manually reset');
    }

    /**
     * Get all circuit metrics
     */
    getAllMetrics(): Record<string, CircuitBreakerMetrics> {
        return Object.fromEntries(this.metrics);
    }
}

// Global circuit breaker instance
export const circuitBreaker = new CircuitBreaker();

// Pre-configured circuit breakers for common services
export const redisCircuitBreaker = new CircuitBreaker({
    failureThreshold: 3,
    resetTimeout: 10000, // 10 seconds
});

export const openAICircuitBreaker = new CircuitBreaker({
    failureThreshold: 5,
    resetTimeout: 60000, // 1 minute
});
