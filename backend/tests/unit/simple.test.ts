import { describe, it, expect } from 'vitest';

describe('Simple Test Suite', () => {
    it('should pass a basic test', () => {
        expect(true).toBe(true);
    });

    it('should handle basic math', () => {
        expect(2 + 2).toBe(4);
    });

    it('should handle string operations', () => {
        expect('hello').toContain('ell');
        expect('world').toHaveLength(5);
    });
});
