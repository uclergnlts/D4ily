# Kritik Bug Düzeltme Planı

## 🚨 Tespit Edilen Sorunlar

### 1. Backend - Login Endpoint Eksik
**Dosya:** [`backend/src/routes/auth.ts`](backend/src/routes/auth.ts)

**Sorun:** Mobile app `/auth/login` endpoint'ini çağırıyor ama backend'de bu endpoint yok.

**Mevcut Endpoints:**
- ✅ `POST /auth/register` - Kayıt
- ❌ `POST /auth/login` - **EKSİK**
- ✅ `POST /auth/sync` - Firebase sync
- ✅ `GET /auth/me` - Kullanıcı bilgisi
- ✅ `POST /auth/verify-email` - Email doğrulama
- ✅ `DELETE /auth/delete` - Hesap silme

**Çözüm:** Firebase `signInWithEmailAndPassword` kullanarak login endpoint'i ekle.

---

### 2. Mobile - Register Flow API Çağrısı Yok
**Dosya:** [`mobile/app/auth.tsx`](mobile/app/auth.tsx:44-51)

**Sorun:** Register butonuna basıldığında API çağrısı yapılmıyor, doğrudan verify sayfasına yönlendiriliyor.

```typescript
// MEVCUT KOD (YANLIŞ)
} else {
    // Register flow -> Go to Verify Email
    // const data = await authService.register(email, password, name);
    router.push({ pathname: '/auth/verify', params: { email } });
}
```

**Çözüm:** Register API'sini çağır, başarılı olursa verify sayfasına yönlendir.

---

### 3. Mobile - Social Login Mock
**Dosya:** [`mobile/app/auth.tsx`](mobile/app/auth.tsx:60-74)

**Sorun:** Google ve Apple login sadece mock, gerçek Firebase entegrasyonu yok.

```typescript
// MEVCUT KOD (MOCK)
const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setLoading(true);
    setTimeout(async () => {
        const mockUser = { ... };
        await login(mockUser, 'mock-social-token');
        setLoading(false);
        router.back();
    }, 1500);
};
```

**Çözüm:** Firebase Auth ile gerçek Google/Apple login entegrasyonu.

---

### 4. Mobile - Feed API Fallback
**Dosya:** [`mobile/src/api/services/feedService.ts`](mobile/src/api/services/feedService.ts:19-24)

**Sorun:** API başarısız olursa otomatik mock data kullanıyor. Bu gerçek bir çözüm değil.

```typescript
// MEVCUT KOD
} catch (error) {
    console.warn('API connection failed, falling back to Mock Data for Feed.', error);
    await new Promise(resolve => setTimeout(resolve, 800));
    return getMockFeed(country, page);
}
```

**Çözüm:** Hata mesajını göster, mock data'yı kaldır veya sadece development modunda kullan.

---

### 5. Backend - Firebase Konfigürasyon
**Dosya:** [`backend/src/config/firebase.ts`](backend/src/config/firebase.ts)

**Sorun:** Firebase konfigürasyonu environment variable'lardan okunuyor ama `.env.example` dosyasında bu değişkenler eksik olabilir.

**Çözüm:** Environment variable'ları kontrol et ve gerekirse ekle.

---

## 📋 Düzeltme Adımları

### Adım 1: Backend Login Endpoint'i Ekle
**Dosya:** `backend/src/routes/auth.ts`

```typescript
/**
 * POST /auth/login
 * Login with email and password
 */
authRoute.post('/login', authRateLimiter, async (c) => {
    if (!isFirebaseEnabled || !auth) {
        return c.json({
            success: false,
            error: 'Authentication is not configured',
        }, 503);
    }

    try {
        const body = await c.req.json();
        const loginSchema = z.object({
            email: z.string().email(),
            password: z.string().min(1),
        });
        const validatedData = loginSchema.parse(body);

        // Sign in with Firebase
        const userRecord = await auth.getUserByEmail(validatedData.email);
        
        // Verify password (Firebase Admin SDK doesn't have direct password verification)
        // We need to use Firebase Client SDK or create custom token
        // Alternative: Use Firebase REST API for login
        
        // For now, let's use a different approach
        // We'll create a custom token that the client can use
        
        const customToken = await auth.createCustomToken(userRecord.uid);

        // Get user from database
        const user = await db
            .select()
            .from(users)
            .where(eq(users.id, userRecord.uid))
            .get();

        if (!user) {
            return c.json({
                success: false,
                error: 'User not found',
            }, 404);
        }

        logger.info({ userId: userRecord.uid }, 'User logged in successfully');

        return c.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    avatarUrl: user.avatarUrl,
                    userRole: user.userRole,
                    subscriptionStatus: user.subscriptionStatus,
                },
                customToken,
            },
        });
    } catch (error: any) {
        logger.error({ error }, 'Login failed');

        if (error.code === 'auth/user-not-found') {
            return c.json({
                success: false,
                error: 'User not found',
            }, 404);
        }

        return c.json({
            success: false,
            error: error instanceof Error ? error.message : 'Login failed',
        }, 401);
    }
});
```

**Not:** Firebase Admin SDK password verification yapamıyor. İki seçenek var:
1. Firebase Client SDK kullan (mobile app tarafında)
2. Firebase REST API kullan

---

### Adım 2: Mobile Register Flow'u Düzelt
**Dosya:** `mobile/app/auth.tsx`

```typescript
} else {
    // Register flow
    try {
        const data = await authService.register(email, password, name);
        // Store user data temporarily for verification
        await login(data.user, data.customToken);
        router.push({ pathname: '/auth/verify', params: { email } });
    } catch (error: any) {
        Alert.alert('Hata', error.message || 'Kayıt başarısız.');
    }
}
```

---

### Adım 3: Mobile Social Login Entegrasyonu
**Dosya:** `mobile/app/auth.tsx`

Firebase Auth için `@react-native-firebase/auth` paketi kullanılmalı.

```typescript
import auth from '@react-native-firebase/auth';

const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setLoading(true);
    try {
        let userCredential;
        
        if (provider === 'google') {
            userCredential = await auth().signInWithGoogle();
        } else {
            userCredential = await auth().signInWithApple();
        }

        // Sync with backend
        const token = await userCredential.user.getIdToken();
        const response = await fetch(`${API_URL}/auth/sync`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        const data = await response.json();
        
        if (data.success) {
            await login(data.data, token);
            router.back();
        }
    } catch (error: any) {
        Alert.alert('Hata', error.message || 'Giriş başarısız.');
    } finally {
        setLoading(false);
    }
};
```

---

### Adım 4: Feed API Fallback'i Kaldır
**Dosya:** `mobile/src/api/services/feedService.ts`

```typescript
export const feedService = {
    getFeed: async (country: string, page = 1): Promise<FeedResponse> => {
        const params = new URLSearchParams();
        params.append('page', page.toString());

        const response = await client.get<ApiResponse<FeedResponse>>(`/feed/${country}`, { params });

        if (!response.data.success) {
            throw new Error(response.data.error || 'Failed to fetch feed');
        }

        return response.data.data;
    },
    // ... diğer metodlar
};
```

---

### Adım 5: Environment Variable'ları Kontrol Et
**Dosya:** `backend/.env.example`

```bash
# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_DATABASE_URL=your-database-url
```

---

## 🔄 Öncelik Sırası

| Öncelik | Görev | Tahmini Süre |
|---------|--------|--------------|
| 1 | Backend login endpoint'i ekle | 30 dk |
| 2 | Mobile register flow'u düzelt | 15 dk |
| 3 | Environment variable'ları kontrol et | 10 dk |
| 4 | Feed API fallback'i kaldır | 10 dk |
| 5 | Social login entegrasyonu | 2 saat |
| 6 | Test ve doğrulama | 1 saat |

**Toplam:** ~4 saat

---

## 🧪 Test Senaryoları

### Login Testi
1. Geçersiz email ile login → Hata mesajı
2. Geçersiz şifre ile login → Hata mesajı
3. Geçerli bilgiler ile login → Başarılı, token döner

### Register Testi
1. Mevcut email ile register → Hata mesajı
2. Kısa şifre ile register → Hata mesajı
3. Geçerli bilgiler ile register → Başarılı, verify sayfasına yönlendirir

### Feed Testi
1. Backend çalışmıyor → Hata mesajı göster
2. Backend çalışıyor → Haberler yüklenir

---

## 📝 Notlar

1. **Firebase Admin SDK Limitasyonu:** Admin SDK password verification yapamıyor. Bu yüzden login için:
   - Firebase Client SDK kullan (önerilen)
   - Veya Firebase REST API kullan

2. **Social Login:** Gerçek entegrasyon için Firebase Console'da Google ve Apple sign-in'i aktif etmeniz gerekiyor.

3. **Mock Data:** Development için mock data kullanılabilir ama production'da kaldırılmalı.

4. **Error Handling:** Tüm API çağrılarında proper error handling olmalı.

---

*Bu plan, tespit edilen kritik bug'leri düzeltmek için hazırlanmıştır.*
