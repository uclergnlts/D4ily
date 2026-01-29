import { vi } from 'vitest';

/**
 * Creates a mock Firebase Auth object with all common methods
 */
export const createMockFirebaseAuth = () => {
    return {
        verifyIdToken: vi.fn().mockResolvedValue({
            uid: 'test-user-uid',
            email: 'test@example.com',
            email_verified: true,
        }),
        createUser: vi.fn().mockResolvedValue({ uid: 'new-user-uid' }),
        createCustomToken: vi.fn().mockResolvedValue('mock-custom-token'),
        getUser: vi.fn().mockResolvedValue({
            uid: 'test-user-uid',
            email: 'test@example.com',
        }),
        deleteUser: vi.fn().mockResolvedValue(undefined),
        generateEmailVerificationLink: vi.fn().mockResolvedValue('https://verify.link'),
        updateUser: vi.fn().mockResolvedValue(undefined),
        setCustomUserClaims: vi.fn().mockResolvedValue(undefined),
    };
};

/**
 * Creates a complete Firebase module mock
 */
export const createMockFirebaseModule = (options: { enabled?: boolean } = {}) => {
    const { enabled = true } = options;
    const adminAuth = createMockFirebaseAuth();
    
    return {
        adminAuth: enabled ? adminAuth : null,
        isFirebaseEnabled: enabled,
        _mockAuth: adminAuth, // For test access to mock functions
    };
};

/**
 * Default test user for Firebase auth
 */
export const TEST_FIREBASE_USER = {
    uid: 'test-user-uid',
    email: 'test@example.com',
    email_verified: true,
};

/**
 * Default admin user for Firebase auth
 */
export const TEST_ADMIN_USER = {
    uid: 'test-admin-uid',
    email: 'admin@test.com',
    email_verified: true,
};
