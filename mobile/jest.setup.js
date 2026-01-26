/* eslint-disable no-undef */
// Jest setup file for React Native / Expo

// Mock expo-router
jest.mock('expo-router', () => ({
    useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn(),
        back: jest.fn(),
        canGoBack: jest.fn(() => true),
    }),
    useLocalSearchParams: () => ({}),
    useSegments: () => [],
    Link: 'Link',
    Stack: {
        Screen: 'Screen',
    },
}));

// Mock expo-image
jest.mock('expo-image', () => ({
    Image: 'Image',
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
    impactAsync: jest.fn(),
    notificationAsync: jest.fn(),
    selectionAsync: jest.fn(),
    ImpactFeedbackStyle: {
        Light: 'light',
        Medium: 'medium',
        Heavy: 'heavy',
    },
    NotificationFeedbackType: {
        Success: 'success',
        Warning: 'warning',
        Error: 'error',
    },
}));

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
    getItemAsync: jest.fn(() => Promise.resolve(null)),
    setItemAsync: jest.fn(() => Promise.resolve()),
    deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// Mock expo-web-browser
jest.mock('expo-web-browser', () => ({
    openBrowserAsync: jest.fn(() => Promise.resolve({ type: 'cancel' })),
    openAuthSessionAsync: jest.fn(() => Promise.resolve({ type: 'cancel' })),
}));

// Mock expo-constants
jest.mock('expo-constants', () => ({
    default: {
        expoConfig: {
            extra: {
                apiUrl: 'http://localhost:3000',
            },
        },
    },
}));

// Mock @shopify/flash-list
jest.mock('@shopify/flash-list', () => {
    const { FlatList } = require('react-native');
    return {
        FlashList: FlatList,
    };
});

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => {
    const mockIcon = 'Icon';
    return new Proxy({}, {
        get: () => mockIcon,
    });
});

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
    const Reanimated = require('react-native-reanimated/mock');
    Reanimated.default.call = () => {};
    return Reanimated;
});

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
    const View = require('react-native').View;
    return {
        Swipeable: View,
        DrawerLayout: View,
        State: {},
        ScrollView: View,
        Slider: View,
        Switch: View,
        TextInput: View,
        ToolbarAndroid: View,
        ViewPagerAndroid: View,
        DrawerLayoutAndroid: View,
        WebView: View,
        NativeViewGestureHandler: View,
        TapGestureHandler: View,
        FlingGestureHandler: View,
        ForceTouchGestureHandler: View,
        LongPressGestureHandler: View,
        PanGestureHandler: View,
        PinchGestureHandler: View,
        RotationGestureHandler: View,
        RawButton: View,
        BaseButton: View,
        RectButton: View,
        BorderlessButton: View,
        FlatList: View,
        gestureHandlerRootHOC: jest.fn(),
        Directions: {},
        GestureHandlerRootView: View,
    };
});

// Silence console warnings in tests
const originalWarn = console.warn;
console.warn = (...args) => {
    if (
        typeof args[0] === 'string' &&
        (args[0].includes('Animated') ||
            args[0].includes('useNativeDriver') ||
            args[0].includes('componentWillReceiveProps'))
    ) {
        return;
    }
    originalWarn.apply(console, args);
};

// Global test timeout
jest.setTimeout(10000);
