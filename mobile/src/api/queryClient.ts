import { QueryClient, focusManager } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 15,
            gcTime: 1000 * 60 * 60 * 6,
            retry: 1,
            retryDelay: (attemptIndex) => Math.min(1000 * (attemptIndex + 1), 3000),
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            refetchOnMount: false,
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
