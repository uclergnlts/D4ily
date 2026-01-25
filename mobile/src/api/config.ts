import { Platform } from 'react-native';

// Development environment URLs
// 10.0.2.2 is the special alias to host loopback interface (127.0.0.1) on Android emulator used by Android Studio
const DEV_API_URL = Platform.select({
    android: 'http://10.0.2.2:3333',
    ios: 'http://localhost:3333',
    default: 'http://localhost:3333',
});

export const CONFIG = {
    API_URL: process.env.EXPO_PUBLIC_API_URL || DEV_API_URL,
    TIMEOUT: 15000, // 15 seconds
};
