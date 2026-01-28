# D4ily Premium Sistemi Kurulum Rehberi

Bu rehber, RevenueCat entegrasyonunun production ortamında çalışması için gereken adımları açıklar.

## 1. RevenueCat Dashboard Yapılandırması

### 1.1. RevenueCat Hesabı Oluşturma
1. https://app.revenuecat.com adresine gidin
2. Hesap oluşturun veya giriş yapın
3. Yeni bir proje oluşturun: "D4ily"

### 1.2. Uygulama Ekleme

#### iOS (App Store)
1. RevenueCat Dashboard → Apps → Add App
2. Platform: iOS
3. App Name: D4ily
4. Bundle ID: `com.d4ily.app` (veya projenizdeki bundle ID)
5. App-Specific Shared Secret: App Store Connect'ten alınmalı
   - App Store Connect → My Apps → D4ily → App Information → App-Specific Shared Secret

#### Android (Play Store)
1. RevenueCat Dashboard → Apps → Add App
2. Platform: Android
3. App Name: D4ily
4. Package Name: `com.d4ily.app` (veya projenizdeki package name)
5. Service Account JSON: Google Play Console'dan alınmalı
   - Google Play Console → Setup → API Access → Service Accounts
   - Yeni service account oluştur ve JSON key indir
   - RevenueCat'e yükle

## 2. App Store Connect Yapılandırması (iOS)

### 2.1. Paid Apps Sözleşmesi
1. App Store Connect → Agreements, Tax, and Banking
2. "Paid Apps" sözleşmesini imzalayın
3. Banka hesabı ve vergi bilgilerini ekleyin

### 2.2. In-App Purchase Oluşturma
1. App Store Connect → D4ily → Features → In-App Purchases
2. Create New:
   - **Monthly Premium**:
     - Reference Name: Monthly Premium
     - Product ID: `com.d4ily.premium.monthly`
     - Type: Auto-Renewable Subscription
     - Subscription Group: premium
     - Price: 29.99 TRY
   
   - **Yearly Premium**:
     - Reference Name: Yearly Premium
     - Product ID: `com.d4ily.premium.yearly`
     - Type: Auto-Renewable Subscription
     - Subscription Group: premium
     - Price: 299.99 TRY

### 2.3. Subscription Group Ayarları
1. Subscription Groups → premium → Edit
2. Upgrade/Downgrade davranışlarını ayarlayın
3. Introductory offers (opsiyonel): 7 günlük ücretsiz deneme

## 3. Google Play Console Yapılandırması (Android)

### 3.1. Merchant Hesabı
1. Google Play Console → Setup → Payments profile
2. Merchant hesabı oluşturun veya bağlayın

### 3.2. In-App Ürün Oluşturma
1. Google Play Console → D4ily → Monetize → Subscriptions
2. Create subscription:
   - **Monthly Premium**:
     - Product ID: `com.d4ily.premium.monthly`
     - Name: Aylık Premium
     - Description: Reklamsız deneyim ve sınırsız analiz
     - Price: 29.99 TRY
     - Billing period: Monthly
   
   - **Yearly Premium**:
     - Product ID: `com.d4ily.premium.yearly`
     - Name: Yıllık Premium
     - Description: Reklamsız deneyim ve sınırsız analiz (%17 tasarruf)
     - Price: 299.99 TRY
     - Billing period: Yearly

### 3.3. Test Kullanıcıları
1. Google Play Console → D4ily → Testing → Closed testing
2. Test kullanıcıları e-posta adreslerini ekleyin
3. Testers can make purchases: ON

## 4. RevenueCat Ürün ve Entitlement Yapılandırması

### 4.1. Products
RevenueCat Dashboard → Products → Add Product:
- **Monthly**:
  - Product ID: `com.d4ily.premium.monthly`
  - App Store Product ID: `com.d4ily.premium.monthly`
  - Play Store Product ID: `com.d4ily.premium.monthly`

- **Yearly**:
  - Product ID: `com.d4ily.premium.yearly`
  - App Store Product ID: `com.d4ily.premium.yearly`
  - Play Store Product ID: `com.d4ily.premium.yearly`

### 4.2. Entitlements
RevenueCat Dashboard → Entitlements → Add Entitlement:
- Identifier: `premium`
- Products: Monthly + Yearly (her ikisini de ekle)

### 4.3. Offerings
RevenueCat Dashboard → Offerings → Add Offering:
- Identifier: `default`
- Default: ON
- Packages:
  - Monthly: `com.d4ily.premium.monthly`
  - Yearly: `com.d4ily.premium.yearly`

## 5. Webhook Yapılandırması

### 5.1. RevenueCat Webhook URL
RevenueCat Dashboard → Integrations → Webhooks:
- Webhook URL: `https://api.d4ily.com/webhooks/revenuecat`
- Authorization header: (gerekirse)
- Events:
  - ✅ INITIAL_PURCHASE
  - ✅ RENEWAL
  - ✅ CANCELLATION
  - ✅ EXPIRATION
  - ✅ UNCANCELLATION
  - ✅ PRODUCT_CHANGE

### 5.2. Webhook Secret
RevenueCat Dashboard → Webhooks → Show Secret:
- Bu secret'i `REVENUECAT_WEBHOOK_SECRET` olarak backend .env'e ekleyin

## 6. API Keys

### 6.1. Public API Key (Mobile)
RevenueCat Dashboard → API Keys → Public API Key:
- iOS: `appl_...` ile başlar
- Android: `goog_...` ile başlar
- Bu key'leri mobile kodunda kullanın:

```typescript
// usePremium.ts içinde
const REVENUECAT_API_KEY = Platform.select({
    ios: 'appl_YOUR_IOS_KEY',
    android: 'goog_YOUR_ANDROID_KEY',
});
```

### 6.2. Secret API Key (Backend)
RevenueCat Dashboard → API Keys → Secret API Key:
- `sk_...` ile başlar
- Backend .env'e `REVENUECAT_SECRET_API_KEY` olarak ekleyin

## 7. Production Deployment Checklist

### Backend
- [ ] `REVENUECAT_SECRET_API_KEY` environment variable set
- [ ] `REVENUECAT_WEBHOOK_SECRET` environment variable set
- [ ] Webhook endpoint HTTPS üzerinden erişilebilir
- [ ] Database migration uygulandı (subscriptions ve payments tabloları)

### iOS
- [ ] App Store Connect'te IAP'ler "Ready to Submit" durumunda
- [ ] Paid Apps sözleşmesi imzalandı
- [ ] Banka ve vergi bilgileri tamamlandı
- [ ] RevenueCat'te App-Specific Shared Secret eklendi
- [ ] TestFlight ile IAP test edildi

### Android
- [ ] Google Play Console'da IAP'ler aktif
- [ ] Merchant hesabı bağlandı
- [ ] Service Account JSON RevenueCat'e yüklendi
- [ ] Test kullanıcıları eklendi
- [ ] Internal/Closed testing ile IAP test edildi

### RevenueCat
- [ ] Products yapılandırıldı
- [ ] Entitlements yapılandırıldı
- [ ] Offerings yapılandırıldı
- [ ] Webhook yapılandırıldı
- [ ] API keys alındı ve projeye eklendi

## 8. Test Akışı

### Sandbox Test (iOS)
1. Xcode → Product → Scheme → Edit Scheme → Run → Options
2. StoreKit Configuration: "RevenueCat" seçin
3. Cihazda Settings → App Store → Sandbox Account ile giriş yapın
4. Uygulamada satın alma deneyin

### Test (Android)
1. Google Play Console → Test kullanıcısı e-postası ile cihaza giriş yapın
2. Uygulamayı test track'ten indirin
3. Satın alma deneyin (gerçek para çekilmeyecek)

## 9. Sık Karşılaşılan Sorunlar

### "Cannot connect to iTunes Store"
- Sandbox kullanıcısı ile giriş yapıldığından emin olun
- Cihazda App Store'dan çıkış yapın, sadece Settings → Sandbox Account kullanın

### "The item you requested is not available for purchase"
- Product ID'lerin eşleştiğinden emin olun
- Play Console/App Store Connect'te IAP'lerin aktif olduğundan emin olun
- RevenueCat'te products'ların doğru yapılandırıldığından emin olun

### Webhook çalışmıyor
- URL'nin HTTPS olduğundan emin olun
- RevenueCat Dashboard → Webhooks → Test ile test edin
- Backend loglarını kontrol edin

## 10. Önemli Notlar

1. **Test vs Production**: Test API key'ler (`test_...`) sadece development için. Production'da platform-specific key'leri (`appl_...`, `goog_...`) kullanın.

2. **Subscription Lifecycle**: RevenueCat otomatik olarak renewal, cancellation, expiration eventlerini gönderir. Backend webhook handler bu eventleri işler.

3. **Receipt Validation**: RevenueCat otomatik olarak receipt validation yapar. Ek bir işlem gerekmez.

4. **Proration**: Upgrade/downgrade otomatik olarak RevenueCat tarafından yönetilir.

5. **Offline Support**: RevenueCat SDK offline durumda bile çalışır, cache'lenmiş customer info'yu kullanır.
