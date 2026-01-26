 Yeni Backend Dosyaları

 backend/src/
 ├── middleware/
 │   └── premium.ts              # Premium guard middleware
 ├── routes/
 │   └── subscription.ts         # Subscription management
 ├── services/
 │   ├── subscriptionService.ts  # Subscription logic
 │   ├── stripeService.ts        # Stripe integration
 │   ├── iyzicoService.ts        # iyzico integration
 │   ├── emailDigestService.ts   # Email digest generation
 │   └── keywordAlertService.ts  # Keyword monitoring
 ├── cron/
 │   └── emailDigestCron.ts      # Email sending scheduler
 └── webhooks/
     ├── stripeWebhook.ts
     ├── iyzicoWebhook.ts
     ├── appleWebhook.ts
     └── googleWebhook.ts

 Mobil Değişiklikler

 mobile/src/
 ├── screens/
 │   ├── Premium/
 │   │   ├── PaywallScreen.tsx
 │   │   ├── SubscriptionScreen.tsx
 │   │   └── PremiumFeaturesScreen.tsx
 ├── services/
 │   ├── purchaseService.ts      # IAP logic
 │   └── subscriptionSync.ts     # Backend sync
 ├── hooks/
 │   └── usePremium.ts           # Premium status hook
 └── components/
     ├── PremiumBadge.tsx
     ├── PremiumGate.tsx         # Feature gate wrapper
     └── PaywallModal.tsx

 ---
 Doğrulama & Test

 Backend Testleri

- Stripe webhook doğru çalışıyor
- iyzico webhook doğru çalışıyor
- Premium middleware doğru kısıtlıyor
- Subscription expire olunca premium kalkar
- E-posta digest doğru içerik seçiyor

 Mobil Testleri

- iOS satın alma flow çalışıyor
- Android satın alma flow çalışıyor
- Restore purchase çalışıyor
- Premium özellikler doğru gösteriliyor
- Paywall doğru zamanda çıkıyor

 E2E Test Senaryoları

 1. Yeni kullanıcı → Paywall görür → Satın alır → Premium aktif
 2. Premium kullanıcı → Kişisel digest alır → E-posta gelir
 3. Subscription iptal → Period sonunda premium kalkar
 4. Keyword alert → Haber gelince bildirim gider

 ---
 Bağımlılıklar

 Yeni NPM Paketleri (Backend)

- stripe - Stripe SDK
- iyzipay - iyzico SDK

 Yeni NPM Paketleri (Mobile)

- react-native-purchases - RevenueCat (IAP yönetimi için önerilir)
- VEYA native: expo-in-app-purchases

 ---
 Notlar

- Resend zaten mevcut (e-posta için kullanılacak)
- Firebase push notification zaten mevcut
- OpenAI entegrasyonu zaten mevcut (kişiselleştirme için)
- Mevcut digest sistemi genişletilecek
