import type { Href, Router } from 'expo-router';

export function safeBack(router: Router, fallback: Href = '/(tabs)') {
    // Prefer stack-aware dismiss to avoid GO_BACK warnings when no back action exists.
    if (router.canDismiss()) {
        router.dismiss();
        return;
    }

    // Pop to a known screen if possible, otherwise replace with fallback.
    router.dismissTo(fallback);
}
