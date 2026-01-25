import admin from 'firebase-admin';
import { env } from './env.js';
import { logger } from './logger.js';

let isFirebaseEnabled = false;
let adminAuth: admin.auth.Auth | null = null;
let messaging: admin.messaging.Messaging | null = null;

// Initialize Firebase Admin SDK properly
if (admin.apps.length === 0) {
    try {
        // CRITICAL: Replace \\n with actual newlines
        const privateKey = env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '';

        if (!env.FIREBASE_PROJECT_ID || !privateKey || !env.FIREBASE_CLIENT_EMAIL) {
            logger.warn('Missing Firebase credentials - Firebase auth disabled');
            isFirebaseEnabled = false;
        } else {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: env.FIREBASE_PROJECT_ID,
                    privateKey: privateKey,
                    clientEmail: env.FIREBASE_CLIENT_EMAIL,
                }),
            });

            adminAuth = admin.auth();
            messaging = admin.messaging();
            isFirebaseEnabled = true;
            logger.info({ projectId: env.FIREBASE_PROJECT_ID }, '✅ Firebase Admin SDK initialized');
        }
    } catch (error) {
        logger.error({ error }, '❌ Firebase initialization failed');
        isFirebaseEnabled = false;
    }
} else {
    adminAuth = admin.auth();
    messaging = admin.messaging();
    isFirebaseEnabled = true;
    logger.info('Firebase Admin SDK already initialized');
}

// Log to verify
logger.info({ isEnabled: isFirebaseEnabled }, 'Firebase auth exported');

export { adminAuth, isFirebaseEnabled, messaging };
