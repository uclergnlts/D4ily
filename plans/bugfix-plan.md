# Bug Fix ve Kod Kalitesi İyileştirme Planı

## 📋 Özet

Bu plan, D4ily projesindeki mevcut hataları ve kod kalitesi sorunlarını düzeltmek için hazırlanmıştır.

---

## 🔴 Yüksek Öncelik - Backend Test Hataları

### 1. Admin Scrape Test Hatası

**Sorun:** `POST /admin/scrape/:sourceId` testi 400 Bad Request döndürüyor

**Dosya:** [`backend/tests/integration/routes/admin.test.ts`](../backend/tests/integration/routes/admin.test.ts:139)

**Kök Neden:** 
- Mock'lanan source'un `rssUrl` değeri var ama test sırasında adminMiddleware Firebase auth kontrolü yapıyor
- Firebase mock'lanmadığı için auth başarısız oluyor

**Çözüm:**
```typescript
// backend/tests/integration/routes/admin.test.ts

// Firebase auth mock ekle
vi.mock('@/config/firebase.js', () => ({
    adminAuth: {
        verifyIdToken: vi.fn().mockResolvedValue({
            uid: 'test-admin-uid',
            email: 'admin@test.com',
            email_verified: true,
        }),
    },
    isFirebaseEnabled: true,
}));

// Users mock'unu güncelle - admin rolü ekle
vi.mock('@/config/db.js', () => {
    const mockQueryBuilder = {
        // ... mevcut mock
        get: vi.fn().mockImplementation(() => {
            // Farklı sorgular için farklı sonuçlar
            return Promise.resolve({
                id: 'test-admin-uid',
                userRole: 'admin',
                // ... diğer alanlar
            });
        }),
    };
    // ...
});

// Test'e Authorization header ekle
it('should trigger manual scrape', async () => {
    const response = await request(server)
        .post('/admin/scrape/123')
        .set('Authorization', 'Bearer test-token')
        .expect(200);
    // ...
});
```

### 2. Unhandled Errors

**Sorun:** Test sırasında 2 yakalanmamış hata

**Çözüm:**
```typescript
// backend/tests/setup.ts - Global error handler ekle
beforeAll(() => {
    process.on('unhandledRejection', (reason) => {
        console.error('Unhandled Rejection:', reason);
    });
});

afterAll(() => {
    process.removeAllListeners('unhandledRejection');
});
```

---

## 🔴 Yüksek Öncelik - Mobile Test Konfigürasyonu

### Jest Konfigürasyon Hatası

**Sorun:** `ReferenceError: You are trying to import a file outside of the scope of the test code`

**Dosya:** [`mobile/jest.config.js`](../mobile/jest.config.js)

**Kök Neden:** 
- Expo modülleri doğru transform edilmiyor
- Mock dosyası eksik

**Çözüm:**

```javascript
// mobile/jest.config.js - Güncellenmiş
module.exports = {
    preset: 'jest-expo',
    testEnvironment: 'node',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|expo-modules-core|expo-router|expo-linking|expo-constants)',
    ],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    testPathIgnorePatterns: [
        '<rootDir>/node_modules/',
        '<rootDir>/.expo/',
    ],
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
    ],
};
```

```javascript
// mobile/jest.setup.js - Yeni dosya
import '@testing-library/react-native/extend-expect';

// Mock expo modules
jest.mock('expo-router', () => ({
    useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn(),
        back: jest.fn(),
    }),
    useLocalSearchParams: () => ({}),
    Link: 'Link',
}));

jest.mock('expo-image', () => ({
    Image: 'Image',
}));

jest.mock('expo-haptics', () => ({
    impactAsync: jest.fn(),
    ImpactFeedbackStyle: {
        Light: 'light',
        Medium: 'medium',
        Heavy: 'heavy',
    },
}));

jest.mock('expo-secure-store', () => ({
    getItemAsync: jest.fn(),
    setItemAsync: jest.fn(),
    deleteItemAsync: jest.fn(),
}));
```

---

## 🟡 Orta Öncelik - Mobile Lint Hataları

### 1. DisplayName Eksiklikleri (28 bileşen)

**Sorun:** `React.memo` ile sarılmış bileşenlerde displayName eksik

**Etkilenen Dosyalar:**
- `src/components/article/ArticleCard.tsx`
- `src/components/article/ArticleHeader.tsx`
- `src/components/article/ContentQualityBadges.tsx`
- `src/components/article/EmotionalAnalysisCard.tsx`
- `src/components/article/PerspectivesSection.tsx`
- `src/components/article/PoliticalToneGauge.tsx`
- `src/components/article/SourceInfoBar.tsx`
- `src/components/digest/DigestHeader.tsx`
- `src/components/digest/DigestTopicList.tsx`
- `src/components/feed/BalancedFeedScreen.tsx`
- `src/components/feed/FeaturedCarousel.tsx`
- `src/components/feed/FeedFilterBar.tsx`
- `src/components/interaction/AlignmentVotingWidget.tsx`
- `src/components/interaction/CommentCard.tsx`
- `src/components/interaction/CommentForm.tsx`
- `src/components/interaction/CommentThread.tsx`
- `src/components/profile/ProfileHeader.tsx`
- `src/components/profile/ReputationCard.tsx`
- `src/components/profile/StatsOverview.tsx`
- `src/components/source/ComparisonCard.tsx`
- `src/components/source/SourceAlignmentHistory.tsx`
- `src/components/source/SourceCard.tsx`
- `src/components/ui/NotificationItem.tsx`

**Çözüm Örneği:**
```typescript
// Önce (Hatalı)
export const ArticleCard = React.memo(({ article }: ArticleCardProps) => {
    // ...
});

// Sonra (Düzeltilmiş)
const ArticleCardComponent = ({ article }: ArticleCardProps) => {
    // ...
};

ArticleCardComponent.displayName = 'ArticleCard';
export const ArticleCard = React.memo(ArticleCardComponent);

// VEYA daha kısa yol:
export const ArticleCard = React.memo(function ArticleCard({ article }: ArticleCardProps) {
    // ...
});
```

**Toplu Düzeltme Script'i:**
```bash
# mobile/scripts/fix-display-names.js
# Bu script tüm React.memo bileşenlerine displayName ekler
```

### 2. Unused Imports (95+ uyarı)

**Etkilenen Dosyalar ve Silinecek Import'lar:**

| Dosya | Silinecek Import'lar |
|-------|---------------------|
| `app/(tabs)/_layout.tsx` | `Bookmark` |
| `app/(tabs)/explore.tsx` | `router` (değişken) |
| `app/(tabs)/index.tsx` | `Switch`, `Image`, `Link`, `FlaskConical`, `CountrySelector`, `isSideMenuOpen` |
| `app/(tabs)/profile.tsx` | `LineChart`, `PieChart`, `Animated`, `FadeInDown`, `width`, `selectedTab`, `setSelectedTab` |
| `app/article/[id].tsx` | `Stack`, `KeyboardAvoidingView`, `Platform`, `TextInput`, `Linking`, `Share2`, `MessageSquare`, `usePostComment`, `ContentQualityBadges`, `CommentForm`, `AlignmentVotingWidget`, `commentText`, `setCommentText`, `userVote`, `setUserVote`, `e` |
| `app/auth.tsx` | `X` |
| `app/auth/forgot-password.tsx` | `KeyboardAvoidingView`, `Platform` |
| `app/help.tsx` | `KeyboardAvoidingView`, `Platform`, `FileText` |
| `app/onboarding.tsx` | `Platform`, `ArrowRight`, `Check`, `height` |
| `app/onboarding/sources.tsx` | `Image` |
| `app/podcast.tsx` | `Image`, `Mic`, `router` |
| `app/profile/edit.tsx` | `Check` |
| `app/saved.tsx` | `Image` |
| `app/settings.tsx` | `notificationsEnabled`, `setNotificationsEnabled` |
| `src/api/services/feedService.ts` | `error` (2 yerde) |
| `src/components/article/ArticleHeader.tsx` | `Article` |
| `src/components/article/PoliticalToneGauge.tsx` | `Info` |
| `src/components/article/SourceInfoBar.tsx` | `TouchableOpacity` |
| `src/components/comparison/ComparisonView.tsx` | `useState`, `Image` |
| `src/components/digest/DigestCard.tsx` | `Image`, `accentColor` |
| `src/components/feed/BalancedFeedScreen.tsx` | `Dimensions`, `withTiming` |
| `src/components/feed/FeaturedCarousel.tsx` | `Link`, `e` |
| `src/components/navigation/CountrySelector.tsx` | `Modal`, `FlatList`, `Globe`, `Check` |
| `src/components/navigation/SideMenu.tsx` | `Image` |
| `src/components/source/SourceCard.tsx` | `AlignmentDot` |
| `src/components/ui/AlignmentDot.tsx` | `withDelay` |
| `src/data/mock.ts` | `ArticleSource`, `EmotionalTone` |
| `src/store/useAuthStore.ts` | `error` |
| `src/store/useThemeStore.ts` | `ColorSchemeName` |

### 3. useEffect Dependency Uyarıları (10+ dosya)

**Etkilenen Dosyalar:**

| Dosya | Eksik Dependency |
|-------|-----------------|
| `app/(tabs)/explore.tsx` | `scale` |
| `app/_layout.tsx` | `checkAuth` |
| `src/components/feed/BalancedFeedScreen.tsx` | `indicatorPosition` |
| `src/components/navigation/SideMenu.tsx` | `opacity`, `translateX` |
| `src/components/profile/ReputationCard.tsx` | `width` |
| `src/components/ui/AlignmentDot.tsx` | `opacity`, `scale` |
| `src/components/ui/AlignmentGauge.tsx` | `progress` |
| `src/components/ui/EmotionBar.tsx` | `width` |

**Çözüm Stratejisi:**
```typescript
// Animasyon değerleri için useRef kullan
const scaleRef = useRef(new Animated.Value(1)).current;

useEffect(() => {
    // Animation logic
}, []); // Boş dependency array OK çünkü ref değişmez

// VEYA eslint-disable kullan (animasyonlar için kabul edilebilir)
// eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
    // Animation logic
}, [isVisible]);
```

### 4. Unescaped Entities (6 hata)

**Etkilenen Dosyalar:**

| Dosya | Satır | Karakter |
|-------|-------|----------|
| `app/auth.tsx` | 201 | `'` (2 kez) |
| `app/history.tsx` | 22 | `'` |
| `app/settings/notifications.tsx` | 118 | `"` (2 kez) |

**Çözüm:**
```typescript
// Önce
<Text>Don't worry</Text>

// Sonra
<Text>Don&apos;t worry</Text>
// veya
<Text>{`Don't worry`}</Text>
```

### 5. Duplicate Imports

**Etkilenen Dosyalar:**
- `app/(tabs)/index.tsx` - react-native 2 kez import
- `app/article/[id].tsx` - react-native 2 kez import
- `app/digest/[id].tsx` - react-native 2 kez import

**Çözüm:**
```typescript
// Önce
import { View, Text } from 'react-native';
import { useColorScheme } from 'react-native';

// Sonra
import { View, Text, useColorScheme } from 'react-native';
```

### 6. require() Kullanımı

**Etkilenen Dosya:** `app/article/[id].tsx` (satır 44, 52)

**Çözüm:**
```typescript
// Önce
const logo = require('../../assets/images/logo.png');

// Sonra
import logo from '../../assets/images/logo.png';
```

### 7. Array Type Syntax

**Etkilenen Dosya:** `app/auth/verify.tsx` (satır 12)

**Çözüm:**
```typescript
// Önce
const codes: Array<string> = [];

// Sonra
const codes: string[] = [];
```

---

## 🟢 Düşük Öncelik - Kod Kalitesi İyileştirmeleri

### 1. Import Sıralaması

**Önerilen Sıralama:**
1. React/React Native
2. Expo modülleri
3. Third-party kütüphaneler
4. Yerel modüller (absolute path)
5. Yerel modüller (relative path)
6. Types

### 2. ESLint Konfigürasyonu Güncelleme

```javascript
// mobile/eslint.config.js - Ek kurallar
export default [
    // ... mevcut config
    {
        rules: {
            // Otomatik düzeltilebilir kurallar
            'import/order': ['warn', {
                'groups': ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
                'newlines-between': 'always',
            }],
            'import/no-duplicates': 'error',
            '@typescript-eslint/no-unused-vars': ['warn', { 
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
            }],
        },
    },
];
```

### 3. Prettier Konfigürasyonu

```json
// mobile/.prettierrc
{
    "semi": true,
    "singleQuote": true,
    "tabWidth": 4,
    "trailingComma": "es5",
    "printWidth": 100
}
```

---

## 📝 Uygulama Sırası

### Faz 1: Kritik Hatalar
1. Backend test mock'larını düzelt
2. Mobile Jest konfigürasyonunu düzelt
3. jest.setup.js dosyasını oluştur

### Faz 2: Lint Hataları (Errors)
4. DisplayName eksikliklerini düzelt (28 dosya)
5. Unescaped entities düzelt (3 dosya)
6. require() kullanımını düzelt (1 dosya)

### Faz 3: Lint Uyarıları (Warnings)
7. Unused imports temizle (30+ dosya)
8. Duplicate imports birleştir (3 dosya)
9. useEffect dependency uyarılarını düzelt (10 dosya)

### Faz 4: Kod Kalitesi
10. Import sıralamasını düzenle
11. ESLint kurallarını güncelle
12. Prettier ekle ve formatla

---

## 🔧 Otomatik Düzeltme Komutları

```bash
# Mobile lint auto-fix
cd mobile
npm run lint -- --fix

# Prettier ile formatlama
npx prettier --write "src/**/*.{ts,tsx}"
npx prettier --write "app/**/*.{ts,tsx}"

# Unused imports temizleme (eslint ile)
npx eslint --fix --rule '@typescript-eslint/no-unused-vars: error' src/
```

---

## ✅ Başarı Kriterleri

- [ ] Backend testleri %100 geçiyor
- [ ] Mobile testler çalışıyor
- [ ] Lint hataları 0
- [ ] Lint uyarıları < 10
- [ ] Tüm bileşenlerde displayName mevcut
- [ ] Duplicate import yok
- [ ] Unused import yok
