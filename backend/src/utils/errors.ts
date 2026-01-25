import { Context } from 'hono';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';
import type { ApiResponse } from '../types/index.js';

export function handleError(c: Context, error: unknown, message: string) {
    logger.error({
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        path: c.req.path,
        method: c.req.method,
    }, message);

    const response: ApiResponse<never> = {
        success: false,
        error: message,
        ...(env.NODE_ENV === 'development' && error instanceof Error && {
            details: error.message,
        }),
    };

    return c.json(response, 500);
}
