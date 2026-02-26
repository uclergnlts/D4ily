import { QueryClient, focusManager } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 10, // 10 min — data stays fresh, no unnecessary refetches
            gcTime: 1000 * 60 * 60 * 24, // 24 hours — keep cache long for instant back navigation
            retry: 1,
            retryDelay: (attemptIndex) => Math.min(1000 * (attemptIndex + 1), 3000),
            refetchOnWindowFocus: false, // Don't refetch when app comes to foreground
            refetchOnReconnect: false, // Don't auto-refetch on reconnect
        },
    },
});

focusManager.setEventListener((handleFocus) => {
    const subscription = AppState.addEventListener('change', (state) => {
        if (Platform.OS !== 'web') {
            handleFocus(state === 'active');
        }
    });
    return () => subscription.remove();
});
