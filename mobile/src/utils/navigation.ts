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

let lastNavTime = 0;
const NAV_THROTTLE_MS = 500;

/**
 * Throttled router.push — prevents duplicate screen pushes from rapid taps.
 */
export function safePush(router: Router, href: Href) {
    const now = Date.now();
    if (now - lastNavTime < NAV_THROTTLE_MS) return;
    lastNavTime = now;
    router.push(href);
}
