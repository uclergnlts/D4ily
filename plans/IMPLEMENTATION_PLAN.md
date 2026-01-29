# D4ily - Eksik Bileşenler Uygulama Planı

## 📋 Genel Bakış

Bu plan, mevcut D4ily projesine eksik "az kodla efsane" paketlerini, UI componentlerini ve deployment yapılarını eklemek için detaylı bir yol haritası sunar.

---

## 🎯 Phase 1: Monitoring & Analytics (Sentry + PostHog)

### 1.1 Sentry Kurulumu

#### Backend Sentry
**Dosya:** `backend/src/config/sentry.ts`
```typescript
import * as Sentry from "@sentry/node";

export function initSentry() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: 1.0,
    beforeSend(event) {
      // Sensitive data filtering
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers;
      }
      return event;
    },
  });
}

export function captureException(error: Error, context?: any) {
  Sentry.captureException(error, { extra: context });
}

export function captureMessage(message: string, level: "info" | "warning" | "error") {
  Sentry.captureMessage(message, { level });
}
```

**Dosya:** `backend/src/index.ts` (güncelle)
```typescript
import { initSentry } from "./config/sentry";

// En başta Sentry'i başlat
initSentry();

// Error handling middleware
app.use((err, req, res, next) => {
  captureException(err, { path: req.path, method: req.method });
  res.status(500).json({ error: "Internal server error" });
});
```

**Backend Dependencies:**
```bash
cd backend
npm install @sentry/node
```

**Backend Environment Variables:**
```env
# backend/.env
SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=production
```

#### Mobile Sentry
**Dosya:** `mobile/src/config/sentry.ts`
```typescript
import * as Sentry from "@sentry/react-native";

export function initSentry() {
  Sentry.init({
    dsn: "https://your-dsn@sentry.io/project-id",
    environment: __DEV__ ? "development" : "production",
    tracesSampleRate: 1.0,
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30000,
    beforeSend(event) {
      // Filter out sensitive data
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers;
      }
      return event;
    },
  });
}

export function captureException(error: Error, context?: any) {
  Sentry.captureException(error, { extra: context });
}

export function captureMessage(message: string, level: "info" | "warning" | "error") {
  Sentry.captureMessage(message, { level });
}

export function setUser(user: { id: string; email?: string; username?: string }) {
  Sentry.setUser(user);
}

export function clearUser() {
  Sentry.setUser(null);
}
```

**Dosya:** `mobile/app/_layout.tsx` (güncelle)
```typescript
import { useEffect } from "react";
import { initSentry } from "../src/config/sentry";

export default function RootLayout() {
  useEffect(() => {
    initSentry();
  }, []);

  return (
    <Stack>
      {/* ... */}
    </Stack>
  );
}
```

**Mobile Dependencies:**
```bash
cd mobile
npm install @sentry/react-native
npx @sentry/wizard -i react-native
```

**Mobile Environment Variables:**
```env
# mobile/.env
SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=production
```

### 1.2 PostHog Kurulumu

#### Backend PostHog
**Dosya:** `backend/src/config/posthog.ts`
```typescript
import { PostHog } from "posthog-node";

let posthog: PostHog | null = null;

export function initPostHog() {
  if (!process.env.POSTHOG_API_KEY) {
    console.warn("PostHog API key not found, analytics disabled");
    return;
  }

  posthog = new PostHog(process.env.POSTHOG_API_KEY, {
    host: process.env.POSTHOG_HOST || "https://app.posthog.com",
    flushAt: 20,
    flushInterval: 10000,
  });
}

export function trackEvent(
  eventName: string,
  properties: Record<string, any> = {},
  userId?: string
) {
  if (!posthog) return;

  posthog.capture({
    distinctId: userId || "anonymous",
    event: eventName,
    properties: {
      ...properties,
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
    },
  });
}

export function identifyUser(userId: string, properties: Record<string, any>) {
  if (!posthog) return;

  posthog.identify({
    distinctId: userId,
    properties: {
      ...properties,
      environment: process.env.NODE_ENV || "development",
    },
  });
}

export function flushEvents() {
  if (!posthog) return;
  posthog.flush();
}
```

**Backend Dependencies:**
```bash
cd backend
npm install posthog-node
```

**Backend Environment Variables:**
```env
# backend/.env
POSTHOG_API_KEY=phc_your-api-key
POSTHOG_HOST=https://app.posthog.com
```

#### Mobile PostHog
**Dosya:** `mobile/src/config/posthog.ts`
```typescript
import PostHog from "posthog-react-native";

let posthog: PostHog | null = null;

export function initPostHog() {
  posthog = new PostHog(
    "phc_your-api-key",
    {
      host: "https://app.posthog.com",
      captureApplicationLifecycleEvents: true,
      captureDeepLinks: true,
      captureScreenViews: true,
      debug: __DEV__,
    }
  );
}

export function trackEvent(eventName: string, properties: Record<string, any> = {}) {
  if (!posthog) return;

  posthog.capture(eventName, {
    ...properties,
    platform: "mobile",
    environment: __DEV__ ? "development" : "production",
  });
}

export function identifyUser(userId: string, properties: Record<string, any>) {
  if (!posthog) return;

  posthog.identify(userId, {
    ...properties,
    platform: "mobile",
  });
}

export function resetUser() {
  if (!posthog) return;
  posthog.reset();
}

export function screenView(screenName: string) {
  if (!posthog) return;
  posthog.screen(screenName);
}
```

**Dosya:** `mobile/app/_layout.tsx` (güncelle)
```typescript
import { useEffect } from "react";
import { useSegments } from "expo-router";
import { initPostHog, screenView } from "../src/config/posthog";

export default function RootLayout() {
  const segments = useSegments();

  useEffect(() => {
    initPostHog();
  }, []);

  useEffect(() => {
    const screenName = segments.join("/");
    if (screenName) {
      screenView(screenName);
    }
  }, [segments]);

  return (
    <Stack>
      {/* ... */}
    </Stack>
  );
}
```

**Mobile Dependencies:**
```bash
cd mobile
npm install posthog-react-native
```

**Mobile Environment Variables:**
```env
# mobile/.env
POSTHOG_API_KEY=phc_your-api-key
POSTHOG_HOST=https://app.posthog.com
```

### 1.3 Event Tracking Örnekleri

#### Backend Event Tracking
```typescript
// backend/src/routes/articles.ts
import { trackEvent } from "../config/posthog";

router.get("/articles/:id", async (c) => {
  const articleId = c.req.param("id");
  const userId = c.get("userId");

  // Track article view
  trackEvent("article_viewed", {
    article_id: articleId,
    country: c.req.query("country"),
  }, userId);

  // ...
});

router.post("/articles/:id/like", async (c) => {
  const articleId = c.req.param("id");
  const userId = c.get("userId");

  // Track like
  trackEvent("article_liked", {
    article_id: articleId,
  }, userId);

  // ...
});
```

#### Mobile Event Tracking
```typescript
// mobile/src/hooks/useArticle.ts
import { trackEvent } from "../config/posthog";

export function useArticle() {
  const viewArticle = (articleId: string, country: string) => {
    trackEvent("article_viewed", {
      article_id: articleId,
      country,
    });
  };

  const likeArticle = (articleId: string) => {
    trackEvent("article_liked", {
      article_id: articleId,
    });
  };

  return { viewArticle, likeArticle };
}
```

---

## 🎨 Phase 2: Unified UI Components

### 2.1 LoadingCard Component

**Dosya:** `mobile/src/components/ui/LoadingCard.tsx`
```typescript
import React from "react";
import { View, StyleSheet } from "react-native";
import { Skeleton } from "moti/skeleton";

interface LoadingCardProps {
  variant?: "article" | "digest" | "source";
}

export function LoadingCard({ variant = "article" }: LoadingCardProps) {
  return (
    <View style={styles.container}>
      {variant === "article" && (
        <>
          <Skeleton
            height={200}
            width="100%"
            radius={12}
            colors={["#E0E0E0", "#F5F5F5"]}
          />
          <View style={styles.content}>
            <Skeleton
              height={20}
              width="80%"
              radius={4}
              colors={["#E0E0E0", "#F5F5F5"]}
            />
            <Skeleton
              height={16}
              width="60%"
              radius={4}
              colors={["#E0E0E0", "#F5F5F5"]}
            />
          </View>
        </>
      )}

      {variant === "digest" && (
        <>
          <Skeleton
            height={120}
            width="100%"
            radius={12}
            colors={["#E0E0E0", "#F5F5F5"]}
          />
          <View style={styles.content}>
            <Skeleton
              height={24}
              width="70%"
              radius={4}
              colors={["#E0E0E0", "#F5F5F5"]}
            />
            <Skeleton
              height={16}
              width="90%"
              radius={4}
              colors={["#E0E0E0", "#F5F5F5"]}
            />
          </View>
        </>
      )}

      {variant === "source" && (
        <View style={styles.sourceContainer}>
          <Skeleton
            height={48}
            width={48}
            radius={24}
            colors={["#E0E0E0", "#F5F5F5"]}
          />
          <View style={styles.sourceContent}>
            <Skeleton
              height={20}
              width="60%"
              radius={4}
              colors={["#E0E0E0", "#F5F5F5"]}
            />
            <Skeleton
              height={16}
              width="40%"
              radius={4}
              colors={["#E0E0E0", "#F5F5F5"]}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    marginTop: 12,
    gap: 8,
  },
  sourceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sourceContent: {
    flex: 1,
    gap: 8,
  },
});
```

**Dependencies:**
```bash
cd mobile
npm install moti
```

### 2.2 EmptyState Component

**Dosya:** `mobile/src/components/ui/EmptyState.tsx`
```typescript
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { LucideIcon } from "lucide-react-native";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Icon size={48} color="#9CA3AF" />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.button} onPress={onAction}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: "#F9FAFB",
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  button: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
```

### 2.3 ErrorState Component

**Dosya:** `mobile/src/components/ui/ErrorState.tsx`
```typescript
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { AlertCircle, RefreshCw } from "lucide-react-native";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({
  title = "Bir hata oluştu",
  message,
  onRetry,
  retryLabel = "Tekrar dene",
}: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <AlertCircle size={48} color="#EF4444" />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.button} onPress={onRetry}>
          <RefreshCw size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>{retryLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: "#FEF2F2",
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: #6B7280",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EF4444",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
```

### 2.4 Component Kullanım Örnekleri

#### Feed Screen'de Kullanım
```typescript
// mobile/app/(tabs)/index.tsx
import { LoadingCard } from "../../src/components/ui/LoadingCard";
import { EmptyState } from "../../src/components/ui/EmptyState";
import { ErrorState } from "../../src/components/ui/ErrorState";
import { Newspaper } from "lucide-react-native";

export default function FeedScreen() {
  const { data, isLoading, error, refetch } = useFeed();

  if (isLoading) {
    return (
      <View>
        <LoadingCard variant="article" />
        <LoadingCard variant="article" />
        <LoadingCard variant="article" />
      </View>
    );
  }

  if (error) {
    return (
      <ErrorState
        message="Haberler yüklenirken bir hata oluştu"
        onRetry={() => refetch()}
      />
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={Newspaper}
        title="Henüz haber yok"
        description="Takip ettiğiniz ülkelerden haberler burada görünecek"
        actionLabel="Ülke ekle"
        onAction={() => router.push("/explore")}
      />
    );
  }

  return (
    <FlashList
      data={data}
      renderItem={({ item }) => <ArticleCard article={item} />}
      estimatedItemSize={300}
    />
  );
}
```

---

## 🔔 Phase 3: Push Notifications

### 3.1 Expo Notifications Kurulumu

**Dosya:** `mobile/src/config/notifications.ts`
```typescript
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export async function requestNotificationPermissions() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.warn("Notification permissions not granted");
    return false;
  }

  return true;
}

export async function getPushToken() {
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return null;

  let token: string;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  token = (await Notifications.getExpoPushTokenAsync()).data;
  return token;
}

export async function registerPushToken(userId: string) {
  const token = await getPushToken();
  if (!token) return;

  try {
    await fetch(`${API_BASE_URL}/notifications/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await getAuthToken()}`,
      },
      body: JSON.stringify({
        userId,
        token,
        platform: Platform.OS,
      }),
    });
  } catch (error) {
    console.error("Failed to register push token:", error);
  }
}

export function setupNotificationListeners() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  const subscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      console.log("Notification received:", notification);
    }
  );

  const responseSubscription =
    Notifications.addNotificationResponseReceivedListener((response) => {
      console.log("Notification tapped:", response);
      // Navigate to relevant screen
      const data = response.notification.request.content.data;
      if (data.articleId) {
        router.push(`/article/${data.articleId}`);
      }
    });

  return () => {
    subscription.remove();
    responseSubscription.remove();
  };
}
```

**Dosya:** `mobile/app/_layout.tsx` (güncelle)
```typescript
import { useEffect } from "react";
import { setupNotificationListeners } from "../src/config/notifications";
import { useAuthStore } from "../src/store/useAuthStore";

export default function RootLayout() {
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    const cleanup = setupNotificationListeners();
    return cleanup;
  }, []);

  useEffect(() => {
    if (user?.id) {
      registerPushToken(user.id);
    }
  }, [user?.id]);

  return (
    <Stack>
      {/* ... */}
    </Stack>
  );
}
```

**Dependencies:**
```bash
cd mobile
npx expo install expo-notifications
```

**app.json** (güncelle)
```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/images/notification-icon.png",
          "color": "#ffffff",
          "sounds": []
        }
      ]
    ]
  }
}
```

### 3.2 Backend Notification Service

**Dosya:** `backend/src/services/notificationService.ts`
```typescript
import { Expo, ExpoPushMessage } from "expo-server-sdk";

const expo = new Expo();

interface PushNotificationPayload {
  to: string[];
  title: string;
  body: string;
  data?: Record<string, any>;
}

export async function sendPushNotification({
  to,
  title,
  body,
  data,
}: PushNotificationPayload) {
  const messages: ExpoPushMessage[] = to.map((pushToken) => ({
    to: pushToken,
    sound: "default",
    title,
    body,
    data,
  }));

  const chunks = expo.chunkPushNotifications(messages);
  const tickets = [];

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error("Error sending push notification:", error);
    }
  }

  return tickets;
}

export async function sendDigestNotification(
  userId: string,
  pushTokens: string[],
  digestTitle: string
) {
  return sendPushNotification({
    to: pushTokens,
    title: "Günlük Özetiniz Hazır! 📰",
    body: digestTitle,
    data: {
      type: "digest",
      userId,
    },
  });
}

export async function sendAlignmentNotification(
  userId: string,
  pushTokens: string[],
  articleTitle: string
) {
  return sendPushNotification({
    to: pushTokens,
    title: "Yeni Eşleşme Bulundu! 🎯",
    body: articleTitle,
    data: {
      type: "alignment",
      userId,
    },
  });
}
```

**Backend Dependencies:**
```bash
cd backend
npm install expo-server-sdk
```

---

## 💳 Phase 4: Premium Gates

### 4.1 Premium Hook

**Dosya:** `mobile/src/hooks/usePremium.ts` (güncelle)
```typescript
import { useState, useEffect } from "react";
import Purchases from "react-native-purchases";
import { router } from "expo-router";

interface PremiumState {
  isPremium: boolean;
  isLoading: boolean;
  error: string | null;
}

export function usePremium() {
  const [state, setState] = useState<PremiumState>({
    isPremium: false,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    checkPremiumStatus();
  }, []);

  const checkPremiumStatus = async () => {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const isPremium = Object.values(customerInfo.entitlements.active).length > 0;

      setState({
        isPremium,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setState({
        isPremium: false,
        isLoading: false,
        error: "Premium durumu kontrol edilemedi",
      });
    }
  };

  const requirePremium = (feature: string = "Bu özellik") => {
    if (state.isLoading) return false;

    if (!state.isPremium) {
      router.push("/premium");
      return false;
    }

    return true;
  };

  const purchasePremium = async () => {
    try {
      const offerings = await Purchases.getOfferings();
      const offering = offerings.current;

      if (!offering) {
        throw new Error("Premium paketi bulunamadı");
      }

      const { customerInfo } = await Purchases.purchasePackage(
        offering.availablePackages[0]
      );

      const isPremium = Object.values(customerInfo.entitlements.active).length > 0;

      setState((prev) => ({
        ...prev,
        isPremium,
      }));

      return isPremium;
    } catch (error) {
      console.error("Premium purchase error:", error);
      throw error;
    }
  };

  const restorePurchases = async () => {
    try {
      const customerInfo = await Purchases.restorePurchases();
      const isPremium = Object.values(customerInfo.entitlements.active).length > 0;

      setState((prev) => ({
        ...prev,
        isPremium,
      }));

      return isPremium;
    } catch (error) {
      console.error("Restore purchases error:", error);
      throw error;
    }
  };

  return {
    ...state,
    requirePremium,
    purchasePremium,
    restorePurchases,
    refreshStatus: checkPremiumStatus,
  };
}
```

### 4.2 Compare Screen Premium Gate

**Dosya:** `mobile/src/components/comparison/ComparisonView.tsx` (güncelle)
```typescript
import { useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Lock } from "lucide-react-native";
import { usePremium } from "../../hooks/usePremium";

interface ComparisonViewProps {
  articleId: string;
}

export function ComparisonView({ articleId }: ComparisonViewProps) {
  const { isPremium, isLoading, requirePremium } = usePremium();

  useEffect(() => {
    if (!isLoading && !requirePremium("Karşılaştırma")) {
      return;
    }
  }, [isLoading, requirePremium]);

  if (isLoading) {
    return <LoadingCard variant="article" />;
  }

  if (!isPremium) {
    return (
      <View style={styles.lockedContainer}>
        <View style={styles.lockIcon}>
          <Lock size={48} color="#9CA3AF" />
        </View>
        <Text style={styles.title}>Premium Özellik</Text>
        <Text style={styles.description}>
          Bu haberi diğer kaynaklarla karşılaştırmak için premium'a geçin
        </Text>
        <TouchableOpacity
          style={styles.upgradeButton}
          onPress={() => router.push("/premium")}
        >
          <Text style={styles.upgradeButtonText}>Premium'a Geç</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Premium content
  return (
    <View style={styles.container}>
      {/* Comparison content */}
    </View>
  );
}

const styles = StyleSheet.create({
  lockedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: "#F9FAFB",
  },
  lockIcon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  upgradeButton: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  upgradeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  container: {
    flex: 1,
    padding: 16,
  },
});
```

### 4.3 Comments Premium Gate

**Dosya:** `mobile/src/components/interaction/CommentThread.tsx` (güncelle)
```typescript
import { useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Lock } from "lucide-react-native";
import { usePremium } from "../../hooks/usePremium";

interface CommentThreadProps {
  articleId: string;
}

export function CommentThread({ articleId }: CommentThreadProps) {
  const { isPremium, isLoading, requirePremium } = usePremium();

  useEffect(() => {
    if (!isLoading && !requirePremium("Yorumlar")) {
      return;
    }
  }, [isLoading, requirePremium]);

  if (isLoading) {
    return <LoadingCard variant="article" />;
  }

  if (!isPremium) {
    return (
      <View style={styles.lockedContainer}>
        <View style={styles.lockIcon}>
          <Lock size={32} color="#9CA3AF" />
        </View>
        <Text style={styles.title}>Yorumlar Premium</Text>
        <Text style={styles.description}>
          Yorum yazmak ve okumak için premium'a geçin
        </Text>
        <TouchableOpacity
          style={styles.upgradeButton}
          onPress={() => router.push("/premium")}
        >
          <Text style={styles.upgradeButtonText}>Premium'a Geç</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Premium content
  return (
    <View style={styles.container}>
      {/* Comment thread content */}
    </View>
  );
}

const styles = StyleSheet.create({
  lockedContainer: {
    padding: 24,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    alignItems: "center",
  },
  lockIcon: {
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 16,
  },
  upgradeButton: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  upgradeButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  container: {
    flex: 1,
  },
});
```

---

## 🚀 Phase 5: Deployment (Helm Charts)

### 5.1 Helm Chart Yapısı

**Dosya:** `backend/helm/Chart.yaml`
```yaml
apiVersion: v2
name: d4ily-backend
description: D4ily Backend API Helm Chart
type: application
version: 0.1.0
appVersion: "1.0.0"
```

**Dosya:** `backend/helm/values.yaml`
```yaml
replicaCount: 2

image:
  repository: your-registry/d4ily-backend
  pullPolicy: IfNotPresent
  tag: "latest"

service:
  type: ClusterIP
  port: 3000

ingress:
  enabled: true
  className: "nginx"
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
  hosts:
    - host: api.d4ily.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: d4ily-tls
      hosts:
        - api.d4ily.com

resources:
  limits:
    cpu: 1000m
    memory: 512Mi
  requests:
    cpu: 500m
    memory: 256Mi

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70
  targetMemoryUtilizationPercentage: 80

env:
  - name: NODE_ENV
    value: "production"
  - name: DATABASE_URL
    valueFrom:
      secretKeyRef:
        name: d4ily-secrets
        key: database-url
  - name: REDIS_URL
    valueFrom:
      secretKeyRef:
        name: d4ily-secrets
        key: redis-url
  - name: SENTRY_DSN
    valueFrom:
      secretKeyRef:
        name: d4ily-secrets
        key: sentry-dsn
  - name: POSTHOG_API_KEY
    valueFrom:
      secretKeyRef:
        name: d4ily-secrets
        key: posthog-api-key

redis:
  enabled: true
  image:
    repository: redis
    tag: "7-alpine"
  resources:
    limits:
      cpu: 500m
      memory: 256Mi
    requests:
      cpu: 250m
      memory: 128Mi

cron:
  enabled: true
  schedule: "0 */6 * * *"
  image:
    repository: your-registry/d4ily-backend
    tag: "latest"
  command: ["node", "src/cron/scraperCron.ts"]
```

**Dosya:** `backend/helm/templates/deployment.yaml`
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "d4ily-backend.fullname" . }}
  labels:
    {{- include "d4ily-backend.labels" . | nindent 4 }}
spec:
  {{- if not .Values.autoscaling.enabled }}
  replicas: {{ .Values.replicaCount }}
  {{- end }}
  selector:
    matchLabels:
      {{- include "d4ily-backend.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "d4ily-backend.selectorLabels" . | nindent 8 }}
    spec:
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - name: http
              containerPort: {{ .Values.service.port }}
              protocol: TCP
          env:
            {{- range .Values.env }}
            - name: {{ .name }}
              {{- if .value }}
              value: {{ .value | quote }}
              {{- end }}
              {{- if .valueFrom }}
              valueFrom:
                {{- toYaml .valueFrom | nindent 16 }}
              {{- end }}
            {{- end }}
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
          livenessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 5
            periodSeconds: 5
```

**Dosya:** `backend/helm/templates/cronjob.yaml`
```yaml
{{- if .Values.cron.enabled }}
apiVersion: batch/v1
kind: CronJob
metadata:
  name: {{ include "d4ily-backend.fullname" . }}-cron
  labels:
    {{- include "d4ily-backend.labels" . | nindent 4 }}
spec:
  schedule: {{ .Values.cron.schedule | quote }}
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        metadata:
          labels:
            {{- include "d4ily-backend.selectorLabels" . | nindent 12 }}
        spec:
          containers:
            - name: cron
              image: "{{ .Values.cron.image.repository }}:{{ .Values.cron.image.tag }}"
              command: {{ .Values.cron.command }}
              env:
                {{- range .Values.env }}
                - name: {{ .name }}
                  {{- if .value }}
                  value: {{ .value | quote }}
                  {{- end }}
                  {{- if .valueFrom }}
                  valueFrom:
                    {{- toYaml .valueFrom | nindent 18 }}
                  {{- end }}
                {{- end }}
          restartPolicy: OnFailure
{{- end }}
```

**Dosya:** `backend/helm/templates/redis.yaml`
```yaml
{{- if .Values.redis.enabled }}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "d4ily-backend.fullname" . }}-redis
  labels:
    {{- include "d4ily-backend.labels" . | nindent 4 }}
spec:
  replicas: 1
  selector:
    matchLabels:
      {{- include "d4ily-backend.selectorLabels" . | nindent 6 }}
      app: redis
  template:
    metadata:
      labels:
        {{- include "d4ily-backend.selectorLabels" . | nindent 8 }}
        app: redis
    spec:
      containers:
        - name: redis
          image: "{{ .Values.redis.image.repository }}:{{ .Values.redis.image.tag }}"
          ports:
            - containerPort: 6379
          resources:
            {{- toYaml .Values.redis.resources | nindent 12 }}
---
apiVersion: v1
kind: Service
metadata:
  name: {{ include "d4ily-backend.fullname" . }}-redis
  labels:
    {{- include "d4ily-backend.labels" . | nindent 4 }}
spec:
  ports:
    - port: 6379
      targetPort: 6379
  selector:
    {{- include "d4ily-backend.selectorLabels" . | nindent 4 }}
    app: redis
{{- end }}
```

**Dosya:** `backend/helm/templates/ingress.yaml`
```yaml
{{- if .Values.ingress.enabled -}}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ include "d4ily-backend.fullname" . }}
  labels:
    {{- include "d4ily-backend.labels" . | nindent 4 }}
  {{- with .Values.ingress.annotations }}
  annotations:
    {{- toYaml . | nindent 4 }}
  {{- end }}
spec:
  {{- if .Values.ingress.className }}
  ingressClassName: {{ .Values.ingress.className }}
  {{- end }}
  {{- if .Values.ingress.tls }}
  tls:
    {{- range .Values.ingress.tls }}
    - hosts:
        {{- range .hosts }}
        - {{ . | quote }}
        {{- end }}
      secretName: {{ .secretName }}
    {{- end }}
  {{- end }}
  rules:
    {{- range .Values.ingress.hosts }}
    - host: {{ .host | quote }}
      http:
        paths:
          {{- range .paths }}
          - path: {{ .path }}
            pathType: {{ .pathType }}
            backend:
              service:
                name: {{ include "d4ily-backend.fullname" $ }}
                port:
                  number: {{ $.Values.service.port }}
          {{- end }}
    {{- end }}
{{- end }}
```

**Dosya:** `backend/helm/templates/secrets.yaml`
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: d4ily-secrets
  labels:
    {{- include "d4ily-backend.labels" . | nindent 4 }}
type: Opaque
stringData:
  database-url: "libsql://your-database-url"
  redis-url: "redis://d4ily-backend-redis:6379"
  sentry-dsn: "https://your-dsn@sentry.io/project-id"
  posthog-api-key: "phc_your-api-key"
```

**Dosya:** `backend/helm/templates/_helpers.tpl`
```yaml
{{/*
Expand the name of the chart.
*/}}
{{- define "d4ily-backend.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "d4ily-backend.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "d4ily-backend.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "d4ily-backend.labels" -}}
helm.sh/chart: {{ include "d4ily-backend.chart" . }}
{{ include "d4ily-backend.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "d4ily-backend.selectorLabels" -}}
app.kubernetes.io/name: {{ include "d4ily-backend.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
```

### 5.2 Helm Deployment Komutları

```bash
# Helm chart'ı yükle
helm install d4ily-backend ./backend/helm

# Helm chart'ı güncelle
helm upgrade d4ily-backend ./backend/helm

# Helm chart'ı sil
helm uninstall d4ily-backend

# Values override ile yükle
helm install d4ily-backend ./backend/helm --values custom-values.yaml

# Dry-run (test)
helm install d4ily-backend ./backend/helm --dry-run --debug
```

---

## 📊 Phase 6: OpenAPI Spec & API Client Codegen

### 6.1 OpenAPI Spec Oluşturma

**Dosya:** `backend/src/openapi/openapi.yaml`
```yaml
openapi: 3.0.0
info:
  title: D4ily API
  description: D4ily News Platform API
  version: 1.0.0
  contact:
    name: D4ily Team
    email: team@d4ily.com

servers:
  - url: https://api.d4ily.com/v1
    description: Production server
  - url: http://localhost:3000/v1
    description: Development server

tags:
  - name: Articles
    description: Article operations
  - name: Digest
    description: Digest operations
  - name: Premium
    description: Premium operations
  - name: User
    description: User operations

paths:
  /articles:
    get:
      tags:
        - Articles
      summary: Get articles
      description: Retrieve a list of articles with optional filters
      parameters:
        - name: country
          in: query
          schema:
            type: string
          description: Filter by country code
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
          description: Number of articles to return
        - name: offset
          in: query
          schema:
            type: integer
            default: 0
          description: Offset for pagination
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
                properties:
                  articles:
                    type: array
                    items:
                      $ref: '#/components/schemas/Article'
                  total:
                    type: integer
                  hasMore:
                    type: boolean

  /articles/{id}:
    get:
      tags:
        - Articles
      summary: Get article by ID
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Article'
        '404':
          description: Article not found

  /digest:
    get:
      tags:
        - Digest
      summary: Get daily digest
      parameters:
        - name: country
          in: query
          schema:
            type: string
          description: Filter by country code
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Digest'

  /premium/status:
    get:
      tags:
        - Premium
      summary: Get premium status
      security:
        - bearerAuth: []
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
                properties:
                  isPremium:
                    type: boolean
                  expiresAt:
                    type: string
                    format: date-time

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    Article:
      type: object
      properties:
        id:
          type: string
        title:
          type: string
        summary:
          type: string
        content:
          type: string
        source:
          $ref: '#/components/schemas/Source'
        country:
          type: string
        publishedAt:
          type: string
          format: date-time
        emotionalAnalysis:
          $ref: '#/components/schemas/EmotionalAnalysis'
        politicalTone:
          $ref: '#/components/schemas/PoliticalTone'

    Source:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        url:
          type: string
        logo:
          type: string
        alignment:
          type: number
          minimum: -1
          maximum: 1

    EmotionalAnalysis:
      type: object
      properties:
        sentiment:
          type: number
          minimum: -1
          maximum: 1
        emotions:
          type: object
          properties:
            joy:
              type: number
            anger:
              type: number
            fear:
              type: number
            sadness:
              type: number

    PoliticalTone:
      type: object
      properties:
        score:
          type: number
          minimum: -1
          maximum: 1
        label:
          type: string
          enum: [left, center-left, center, center-right, right]

    Digest:
      type: object
      properties:
        id:
          type: string
        date:
          type: string
          format: date
        country:
          type: string
        articles:
          type: array
          items:
            $ref: '#/components/schemas/Article'
        summary:
          type: string
```

### 6.2 API Client Codegen

**Dosya:** `mobile/orval.config.ts`
```typescript
import { defineConfig } from "orval";

export default defineConfig({
  d4ily: {
    output: "./src/services/api",
    input: "../backend/src/openapi/openapi.yaml",
    hooks: {
      afterAllFilesWrite: "prettier --write",
    },
    client: "axios",
    override: {
      mutator: {
        path: "./src/api/client.ts",
        name: "customInstance",
      },
      query: {
        useInfinite: true,
        useInfiniteQueryParam: "pageParam",
      },
    },
  },
});
```

**Dosya:** `mobile/src/api/client.ts`
```typescript
import axios, { AxiosError } from "axios";
import { getAuthToken } from "../utils/firebaseAuth";

export const customInstance = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/v1",
  timeout: 10000,
});

customInstance.interceptors.request.use(async (config) => {
  const token = await getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

customInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
    }
    return Promise.reject(error);
  }
);

export default customInstance;
```

**Dependencies:**
```bash
cd mobile
npm install orval axios
```

**package.json** (güncelle)
```json
{
  "scripts": {
    "generate-api": "orval"
  }
}
```

**API Client Kullanımı:**
```typescript
import { useArticles } from "../services/api/d4ily";

export function useFeed() {
  return useArticles({
    query: {
      country: "TR",
      limit: 20,
    },
  });
}
```

---

## 📝 Özet

Bu plan, mevcut D4ily projesine eksik bileşenleri eklemek için detaylı bir yol haritası sunar:

1. **Phase 1:** Sentry + PostHog kurulumu (monitoring & analytics)
2. **Phase 2:** Unified UI componentleri (LoadingCard, EmptyState, ErrorState)
3. **Phase 3:** Push notifications (Expo Notifications)
4. **Phase 4:** Premium gates (Compare, Comments)
5. **Phase 5:** Helm charts (Kubernetes deployment)
6. **Phase 6:** OpenAPI spec + API client codegen

Her phase, mevcut yapıyı koruyarak sadece ekleme yapar. Yapı değişikliği gerektirmez.
