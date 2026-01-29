import { vi } from 'vitest';

/**
 * Creates a mock query builder that chains methods and returns mock data
 */
export const createMockQueryBuilder = (defaultData: any = null) => {
    return {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(defaultData),
        all: vi.fn().mockResolvedValue(defaultData ? [defaultData] : []),
        then: (resolve: any) => resolve(defaultData ? [defaultData] : []),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
    };
};

/**
 * Creates a mock database object with all common methods
 */
export const createMockDb = (defaultData: any = null) => {
    const queryBuilder = createMockQueryBuilder(defaultData);
    return {
        db: {
            select: vi.fn().mockReturnValue(queryBuilder),
            insert: vi.fn().mockReturnValue(queryBuilder),
            update: vi.fn().mockReturnValue(queryBuilder),
            delete: vi.fn().mockReturnValue(queryBuilder),
        },
        queryBuilder,
    };
};

/**
 * Creates a mock database with custom get/all implementations
 */
export const createMockDbWithCustomData = (getData: () => any, getAllData: () => any[]) => {
    const queryBuilder = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        get: vi.fn().mockImplementation(() => Promise.resolve(getData())),
        all: vi.fn().mockImplementation(() => Promise.resolve(getAllData())),
        then: (resolve: any) => resolve(getAllData()),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
    };

    return {
        db: {
            select: vi.fn().mockReturnValue(queryBuilder),
            insert: vi.fn().mockReturnValue(queryBuilder),
            update: vi.fn().mockReturnValue(queryBuilder),
            delete: vi.fn().mockReturnValue(queryBuilder),
        },
        queryBuilder,
    };
};
