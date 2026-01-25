import { describe, it, expect, vi } from 'vitest';

describe('Example Test Suite', () => {
    describe('Basic Assertions', () => {
        it('should pass a simple test', () => {
            expect(true).toBe(true);
        });

        it('should handle numbers correctly', () => {
            const sum = 2 + 2;
            expect(sum).toBe(4);
            expect(sum).toBeGreaterThan(3);
            expect(sum).toBeLessThan(5);
        });

        it('should handle strings correctly', () => {
            const message = 'Hello Vitest';
            expect(message).toContain('Vitest');
            expect(message).toHaveLength(12);
        });

        it('should handle arrays correctly', () => {
            const numbers = [1, 2, 3, 4, 5];
            expect(numbers).toHaveLength(5);
            expect(numbers).toContain(3);
            expect(numbers).toEqual([1, 2, 3, 4, 5]);
        });

        it('should handle objects correctly', () => {
            const user = { name: 'Test User', age: 25 };
            expect(user).toHaveProperty('name');
            expect(user.name).toBe('Test User');
            expect(user).toEqual({ name: 'Test User', age: 25 });
        });
    });

    describe('Async Operations', () => {
        it('should handle promises', async () => {
            const promise = Promise.resolve('success');
            await expect(promise).resolves.toBe('success');
        });

        it('should handle async functions', async () => {
            const asyncFn = async () => {
                return 'async result';
            };
            const result = await asyncFn();
            expect(result).toBe('async result');
        });
    });

    describe('Mocking', () => {
        it('should mock functions', () => {
            const mockFn = vi.fn();
            mockFn('hello');
            mockFn('world');

            expect(mockFn).toHaveBeenCalledTimes(2);
            expect(mockFn).toHaveBeenCalledWith('hello');
            expect(mockFn).toHaveBeenCalledWith('world');
        });

        it('should mock return values', () => {
            const mockFn = vi.fn();
            mockFn.mockReturnValue('mocked value');

            const result = mockFn();
            expect(result).toBe('mocked value');
        });
    });
});
