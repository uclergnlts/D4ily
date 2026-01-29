import { describe, it, expect, vi } from 'vitest';
import { handleError } from '../../src/utils/errors.js';

describe('Error Utils', () => {
    describe('handleError', () => {
        it('should handle Error instances correctly', () => {
            const mockJson = vi.fn();
            const mockContext = {
                req: {
                    path: '/test',
                    method: 'GET',
                },
                json: mockJson,
            };

            const error = new Error('Test error message');
            handleError(mockContext as any, error, 'Operation failed');

            expect(mockJson).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    error: 'Operation failed',
                }),
                500
            );
        });

        it('should handle non-Error values', () => {
            const mockJson = vi.fn();
            const mockContext = {
                req: {
                    path: '/test',
                    method: 'POST',
                },
                json: mockJson,
            };

            handleError(mockContext as any, 'string error', 'Operation failed');

            expect(mockJson).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    error: 'Operation failed',
                }),
                500
            );
        });
    });
});
