import { useState, useEffect, useCallback } from 'react';
import Purchases, { PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import { Platform } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';

const REVENUECAT_API_KEY = Platform.select({
    ios: 'test_CaEVCJZXSWamswOHAcBeiiPjoAX', // Test key
    android: 'test_CaEVCJZXSWamswOHAcBeiiPjoAX', // Test key
    default: 'test_CaEVCJZXSWamswOHAcBeiiPjoAX',
});

export interface PremiumPlan {
    id: string;
    name: string;
    price: number;
    currency: string;
    duration: string;
    features: string[];
}

export interface SubscriptionInfo {
    id: string;
    planId: 'monthly' | 'yearly';
    status: 'active' | 'cancelled' | 'expired';
    provider: 'stripe' | 'iyzico' | 'apple' | 'google';
    currentPeriodStart: Date;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
}

export function usePremium() {
    const { user, token } = useAuthStore();
    const [isPremium, setIsPremium] = useState(false);
    const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
    const [packages, setPackages] = useState<PurchasesPackage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Initialize RevenueCat
    useEffect(() => {
        const initPurchases = async () => {
            try {
                Purchases.configure({ apiKey: REVENUECAT_API_KEY });

                if (user?.uid) {
                    await Purchases.logIn(user.uid);
                }

                await loadOfferings();
                await checkSubscriptionStatus();
            } catch (err) {
                console.error('Failed to initialize purchases:', err);
                setError('Ödeme sistemi başlatılamadı');
            } finally {
                setIsLoading(false);
            }
        };

        initPurchases();

        return () => {
            // Cleanup if needed
        };
    }, [user?.uid]);

    // Load available offerings/packages
    const loadOfferings = useCallback(async () => {
        try {
            const offerings = await Purchases.getOfferings();

            if (offerings.current?.availablePackages) {
                setPackages(offerings.current.availablePackages);
            }
        } catch (err) {
            console.error('Failed to load offerings:', err);
            setError('Paketler yüklenemedi');
        }
    }, []);

    // Check subscription status from RevenueCat
    const checkSubscriptionStatus = useCallback(async () => {
        try {
            const customerInfo = await Purchases.getCustomerInfo();
            updatePremiumStatus(customerInfo);
        } catch (err) {
            console.error('Failed to check subscription:', err);
        }
    }, []);

    // Update premium status based on customer info
    const updatePremiumStatus = useCallback((customerInfo: CustomerInfo) => {
        const isPro = customerInfo.entitlements.active['premium'] !== undefined;
        setIsPremium(isPro);

        // Get subscription details if active
        const premiumEntitlement = customerInfo.entitlements.active['premium'];
        if (premiumEntitlement) {
            setSubscription({
                id: premiumEntitlement.identifier,
                planId: premiumEntitlement.productIdentifier.includes('yearly') ? 'yearly' : 'monthly',
                status: premiumEntitlement.willRenew ? 'active' : 'cancelled',
                provider: mapStoreToProvider(premiumEntitlement.store),
                currentPeriodStart: new Date(premiumEntitlement.originalPurchaseDateMillis),
                currentPeriodEnd: premiumEntitlement.expirationDateMillis
                    ? new Date(premiumEntitlement.expirationDateMillis)
                    : null,
                cancelAtPeriodEnd: !premiumEntitlement.willRenew,
            });
        } else {
            setSubscription(null);
        }
    }, []);

    // Purchase a package
    const purchasePackage = useCallback(async (pkg: PurchasesPackage) => {
        setIsLoading(true);
        setError(null);

        try {
            const { customerInfo } = await Purchases.purchasePackage(pkg);
            updatePremiumStatus(customerInfo);

            // Sync with backend
            await syncSubscriptionWithBackend(customerInfo);

            return { success: true };
        } catch (err: any) {
            console.error('Purchase failed:', err);

            if (err.userCancelled) {
                return { success: false, cancelled: true };
            }

            setError(err.message || 'Satın alma başarısız');
            return { success: false, error: err.message };
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Restore purchases
    const restorePurchases = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const customerInfo = await Purchases.restorePurchases();
            updatePremiumStatus(customerInfo);

            // Sync with backend
            await syncSubscriptionWithBackend(customerInfo);

            return { success: true };
        } catch (err: any) {
            console.error('Restore failed:', err);
            setError(err.message || 'Satın almalar geri yüklenemedi');
            return { success: false, error: err.message };
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Sync subscription with backend
    const syncSubscriptionWithBackend = useCallback(async (customerInfo: CustomerInfo) => {
        try {
            const premiumEntitlement = customerInfo.entitlements.active['premium'];

            if (!premiumEntitlement || !token) return;

            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/premium/subscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    planId: premiumEntitlement.productIdentifier.includes('yearly') ? 'yearly' : 'monthly',
                    provider: mapStoreToProvider(premiumEntitlement.store),
                    providerSubscriptionId: premiumEntitlement.identifier,
                    currentPeriodStart: premiumEntitlement.originalPurchaseDateMillis,
                    currentPeriodEnd: premiumEntitlement.expirationDateMillis,
                }),
            });

            if (!response.ok) {
                console.error('Failed to sync subscription with backend');
            }
        } catch (err) {
            console.error('Sync with backend failed:', err);
        }
    }, [token]);

    return {
        isPremium,
        subscription,
        packages,
        isLoading,
        error,
        purchasePackage,
        restorePurchases,
        checkSubscriptionStatus,
    };
}

// Helper function to map store to provider
function mapStoreToProvider(store: string): 'stripe' | 'iyzico' | 'apple' | 'google' {
    switch (store) {
        case 'APP_STORE':
            return 'apple';
        case 'PLAY_STORE':
            return 'google';
        case 'STRIPE':
            return 'stripe';
        default:
            return 'apple';
    }
}
