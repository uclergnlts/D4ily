import 'dotenv/config';
import { adminAuth, isFirebaseEnabled } from './src/config/firebase.js';

async function testFirebaseConnection() {
    console.log('Testing Firebase Connection...');
    console.log('Firebase Enabled:', isFirebaseEnabled);

    if (!isFirebaseEnabled || !adminAuth) {
        console.error('Firebase not enabled or auth not initialized');
        return;
    }

    try {
        console.log('Attempting to list users...');
        const listUsersResult = await adminAuth.listUsers(1);
        console.log('Successfully listed users!');
        console.log('User count:', listUsersResult.users.length);

        if (listUsersResult.users.length > 0) {
            console.log('First user:', listUsersResult.users[0].email);
        }

        console.log('Attempting to create a test user...');
        try {
            const user = await adminAuth.createUser({
                email: `test-${Date.now()}@example.com`,
                password: 'password123',
                displayName: 'Test User'
            });
            console.log('Successfully created user:', user.uid);
            // Clean up
            await adminAuth.deleteUser(user.uid);
            console.log('Successfully deleted test user');
        } catch (createError) {
            console.error('Failed to create user:', createError);
        }

    } catch (error) {
        console.error('Failed to list users:', error);
    }
}

testFirebaseConnection();
