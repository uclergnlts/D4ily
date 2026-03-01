# D4ily News Platform - Yazılım Analiz Raporu

**Analiz Tarihi:** 2026-03-01  
**Proje:** D4ily Monorepo (Backend + Admin Panel)  
**Teknoloji Stack:** Hono/TypeScript, Drizzle ORM, SQLite/LibSQL, React/Vite

---

## 1. GÜVENLİK AÇIKLARI VE SORUNLARI

### 🔴 YÜKSEK ÖNCELİKLİ

#### 1.1 UID/Email Fallback Güvenlik Açığı (Auth Middleware)
**Dosya:** [`backend/src/middleware/auth.ts`](backend/src/middleware/auth.ts:110-132)  
**Sorun:** Admin middleware'de Firebase UID eşleşmemesi durumunda e-posta adresiyle kullanıcı araması yapılıyor.

```typescript
// Geriye uyumluluk için UID değişikliğinde e-posta ile arama
if (!user && decodedToken.email) {
    user = await db
        .select()
        .from(users)
        .where(eq(users.email, decodedToken.email))
        .get();
}
```

**Risk:** E-posta adresi taklit edilebilir veya hesap devri sonrası yetkisiz erişim sağlanabilir.  
**Öneri:** Bu fallback mekanizması kaldırılmalı veya ek güvenlik doğrulaması (örn: son giriş zamanı, cihaz fingerprint) eklenmeli.

#### 1.2 API Key Paylaşımı
**Dosya:** [`backend/src/index.ts`](backend/src/index.ts:74)  
**Sorun:** `OPS_API_KEY` tanımlı değilse `ADMIN_API_KEY` değeri kullanılıyor.

```typescript
const configuredOpsKey = env.OPS_API_KEY || env.ADMIN_API_KEY || '';
```

**Risk:** Aynı anahtarın birden fazla amaçla kullanımı yetki sızıntısına yol açabilir.  
**Öneri:** Ops ve Admin için ayrı zorunlu API key'ler tanımlanmalı.

#### 1.3 Rate Limiter - In-Memory State
**Dosya:** [`backend/src/middleware/rateLimiter.ts`](backend/src/middleware/rateLimiter.ts:11)  
**Sorun:** Rate limiter `Map` kullanıyor, horizontal scaling'de çalışmaz.

```typescript
const rateLimitStore = new Map<string, RateLimitEntry>();
```

**Risk:** Birden fazla instance çalıştığında rate limit atlanabilir.  
**Öneri:** Redis tabanlı rate limiter kullanılmalı (mevcut Redis yapılandırması zaten var).

---

### 🟠 ORTA ÖNCELİKLİ

#### 1.4 Webhook Signature Bypass (Development Mode)
**Dosya:** [`backend/src/routes/webhooks.ts`](backend/src/routes/webhooks.ts:100-104)  
**Sorun:** Geliştirme ortamında webhook imza doğrulaması atlanıyor.

```typescript
function verifyWebhookSignature(rawBody: string, signature: string | undefined): boolean {
    const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;
    // In development, allow missing signature if secret is not set
}
```

**Risk:** Geliştirme ortamında üretim verisi kullanılırsa veya yapılandırma hatası olursa yetkisiz webhook kabul edilebilir.  
**Öneri:** İmza doğrulaması her ortamda zorunlu olmalı.

#### 1.5 Input Validation Eksiklikleri
**Dosya:** [`backend/src/routes/comments.ts`](backend/src/routes/comments.ts:23-27)  
**Sorun:** Yorum içeriği için `parentCommentId` nullable ancak ek validasyon yok.

```typescript
const createCommentSchema = z.object({
    articleId: z.string().min(1, 'Target ID is required'),
    targetType: targetTypeSchema.optional(),
    content: z.string().min(1).max(1000),
    parentCommentId: z.string().nullable().optional(), // Validasyon yetersiz
});
```

**Risk:** Parent comment'in varlığı kontrol edilmiyor.  
**Öneri:** Parent comment'in varlığı ve ülke kodu uygunluğu kontrol edilmeli.

---

### 🟡 DÜŞÜK ÖNCELİKLİ

#### 1.6 Admin Panel - XSS Riski
**Dosya:** [`admin/src/pages/UsersPage.tsx`](admin/src/pages/UsersPage.tsx:40-44)  
**Sorun:** Avatar URL doğrudan `img` src'ye atanıyor.

```tsx
<img src={info.row.original.avatarUrl} alt="" className="h-8 w-8 rounded-full" />
```

**Risk:** Kötü niyetli avatar URL'si XSS'e yol açabilir.  
**Öneri:** URL validasyonu veya sanitizasyon uygulanmalı.

---

## 2. MİMARİ ZAYIFLIKLAR

### 🔴 YÜKSEK ÖNCELİKLİ

#### 2.1 Ülke Başına Ayrı Tablo Yapısı (Code Duplication)
**Dosya:** [`backend/src/db/schema/articles.ts`](backend/src/db/schema/articles.ts:135-191)  
**Sorun:** Her ülke için ayrı tablolar tanımlanmış (`tr_articles`, `de_articles`, vb.).

```typescript
export const tr_articles = createArticleTable('tr');
export const de_articles = createArticleTable('de');
// ... 8 ülke daha
```

**Risk:** 
- Bakım zorluğu (8 ülke × 5 tablo = 40+ tablo)
- Yeni ülke eklemek kod değişikliği gerektiriyor
- Drizzle migrasyon karmaşıklığı

**Öneri:** Single-table design with partitioning veya composite key (`country_code` + `article_id`) kullanılmalı.

#### 2.2 Hardcoded Ülke Kodları
**Dosya:** [`backend/src/routes/feed.ts`](backend/src/routes/feed.ts:118-127)  
**Sorun:** Ülke kodları her yerde hardcoded.

```typescript
const COUNTRY_TABLES = {
    tr: { articles: tr_articles, sources: tr_article_sources },
    de: { articles: de_articles, sources: de_article_sources },
    // ...
} as const;
```

**Risk:** Yeni ülke eklemek çok fazla dosyada değişiklik gerektiriyor.  
**Öneri:** Ülke konfigürasyonu veritabanından yönetilmeli.

---

### 🟠 ORTA ÖNCELİKLİ

#### 2.3 AI Processing Queue - In-Memory
**Dosya:** [`backend/src/services/scraper/scraperService.ts`](backend/src/services/scraper/scraperService.ts:41-42)  
**Sorun:** AI işleme kuyruğu in-memory.

```typescript
const aiProcessingQueue: Array<() => Promise<void>> = [];
let isProcessingQueue = false;
```

**Risk:** 
- Process restart olduğunda kuyruk kaybolur
- Horizontal scaling imkansız
- Bellek sızıntısı riski

**Öneri:** Redis-based queue (Bull/BullMQ) veya dedicated worker process kullanılmalı.

#### 2.4 Cron Logları - In-Memory
**Dosya:** [`backend/src/routes/admin.ts`](backend/src/routes/admin.ts:72-82)  
**Sorun:** Cron logları bellekte tutuluyor (max 200 entry).

```typescript
const cronLogs: CronLogEntry[] = [];
const MAX_CRON_LOGS = 200;
```

**Risk:** Server restart olduğunda loglar kaybolur.  
**Öneri:** Loglar veritabanına veya merkezi log sisteme (ELK, Loki) yazılmalı.

---

## 3. PERFORMANS DARBOĞAZLARI

### 🔴 YÜKSEK ÖNCELİKLİ

#### 3.1 Feed Endpoint - N+1 Query Riski
**Dosya:** [`backend/src/routes/feed.ts`](backend/src/routes/feed.ts:49-74)  
**Sorun:** `withQueryTimeout` fonksiyonu query başına timeout uyguluyor ama concurrent query sayısı sınırlı.

```typescript
async function withQueryTimeout<T>(
    queryFn: () => Promise<T>,
    timeoutMs: number = QUERY_TIMEOUT,
): Promise<T> { ... }
```

**Risk:** Yüksek trafikte connection pool tükenebilir.  
**Öneri:** Connection pooling ve query batching optimize edilmeli.

#### 3.2 AI Cache - LRU Eviction
**Dosya:** [`backend/src/services/ai/aiService.ts`](backend/src/services/ai/aiService.ts:39-52)  
**Sorun:** AI cache LRU eviction O(n log n) complexity.

```typescript
function enforceCacheSizeLimit(): void {
    const entries = Array.from(aiCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    // ...
}
```

**Risk:** 10.000 entry için sıralama yapmak performans sorunu yaratabilir.  
**Öneri:** LRU Cache kütüphanesi (lru-cache) kullanılmalı.

---

### 🟠 ORTA ÖNCELİKLİ

#### 3.3 Database Query Timeout - Hardcoded
**Dosya:** [`backend/src/routes/feed.ts`](backend/src/routes/feed.ts:41)  
**Sorun:** Query timeout değerleri sabit kodlanmış.

```typescript
const QUERY_TIMEOUT = 8000;       // 8 seconds
const FEED_ROUTE_BUDGET_MS = 600;
```

**Risk:** Farklı endpoint'ler için farklı timeout ihtiyaçları olabilir.  
**Öneri:** Timeout değerleri konfigürasyon dosyasından yönetilmeli.

---

## 4. KOD HATALARI VE BUG'LAR

### 🔴 YÜKSEK ÖNCELİKLİ

#### 4.1 getConnInfo Hata Yönetimi
**Dosya:** [`backend/src/middleware/rateLimiter.ts`](backend/src/middleware/rateLimiter.ts:49-57)  
**Sorun:** `getConnInfo` try-catch içinde ama hata durumunda fallback IP güvenilir değil.

```typescript
try {
    const connInfo = getConnInfo(c as any);
    // ...
} catch {
    // Fallback to header-based detection
}
```

**Risk:** `X-Forwarded-For` header spoofing mümkün.  
**Öneri:** Proxy arkasında çalışıyorsa güvenilir IP kaynakları (Cloudflare headers) kullanılmalı.

---

### 🟠 ORTA ÖNCELİKLİ

#### 4.2 Zod Schema - Password Validation
**Dosya:** [`backend/src/routes/auth.ts`](backend/src/routes/auth.ts:20)  
**Sorun:** Şifre validasyonu sadece uzunluk kontrolü yapıyor.

```typescript
password: z.string().min(8).max(100),
```

**Risk:** Zayıf şifrelere izin veriliyor.  
**Öneri:** En az 1 büyük harf, 1 küçük harf, 1 rakam, 1 özel karakter zorunlu olmalı.

#### 4.3 UserActivityLogs - IP Logging
**Dosya:** [`backend/src/db/schema/admin.ts`](backend/src/db/schema/admin.ts:12)  
**Sorun:** IP adresi loglanıyor ama GDPR/privacy compliance kontrol edilmiyor.

```typescript
ipAddress: text('ip_address'),
```

**Risk:** GDPR ihlali riski.  
**Öneri:** IP anonimleştirme veya kullanıcı onayı mekanizması eklenmeli.

---

## 5. TEST KAPSAMI EKSİKLİKLERİ

### 🔴 YÜKSEK ÖNCELİKLİ

#### 5.1 Admin Routes Test Coverage
**Durum:** Admin routes (`admin-analytics.ts`, `admin-campaigns.ts`, `admin-moderation.ts`, `admin-users.ts`) için test dosyası yok.

**Risk:** Admin fonksiyonları test edilmemiş.  
**Öneri:** Her admin route için unit ve integration testleri yazılmalı.

#### 5.2 Cron Job Test Coverage
**Dosya:** `backend/tests/unit/digestCron.test.ts`  
**Durum:** Cron job'lar sınırlı test edilmiş.

**Risk:** Zamanlanmış görevlerde hatalar geç fark edilebilir.  
**Öneri:** Cron job'lar için daha kapsamlı test senaryoları (edge cases, retry logic).

---

### 🟠 ORTA ÖNCELİKLİ

#### 5.3 Integration Test Isolation
**Durum:** Integration test'lerde veritabanı temizliği setup.ts'de yapılıyor.

**Risk:** Paralel test çalıştırma sorun yaratabilir.  
**Öneri:** Her test sonrası rollback veya transaction isolation kullanılmalı.

---

## 6. DOKÜMANTASYON EKSİKLİKLERİ

### 🔴 YÜKSEK ÖNCELİKLİ

#### 6.1 API Dokümantasyonu - Eksik Endpoint'ler
**Durum:** OpenAPI spec var ama bazı yeni endpoint'ler (`/admin/*`, `/ops/*`) eklenmemiş.

**Risk:** API kullanıcıları yeni özelliklerden haberdar olmayabilir.  
**Öneri:** OpenAPI spec otomatik olarak güncellenmeli (hono-openapi veya benzeri).

---

### 🟠 ORTA ÖNCELİKLİ

#### 6.2 Admin Panel Kullanım Kılavuzu
**Durum:** Admin panel için kullanım kılavuzu yok.

**Risk:** Yeni admin kullanıcıları paneli kullanmakta zorlanabilir.  
**Öneri:** Admin panel için inline help veya ayrı dokümantasyon sayfası.

#### 6.3 Deployment Dokümantasyonu
**Durum:** Helm charts var ama deployment adımları dokümante edilmemiş.

**Risk:** Deployment hataları ve rollback prosedürü belirsiz.  
**Öneri:** `DEPLOYMENT.md` dosyası oluşturulmalı.

---

## 7. ÖNERİLEN ÇÖZÜMLER VE ÖNCELİK SIRASI

### Aşama 1: Kritik Güvenlik Düzeltmeleri (1-2 hafta)
1. UID/Email fallback kaldırma veya ek doğrulama ekleme
2. API key ayrımı (Ops vs Admin)
3. Redis-based rate limiter
4. Webhook signature zorunlu hale getirme

### Aşama 2: Mimari İyileştirmeler (2-4 hafta)
1. Ülke tablolarını birleştirme (composite key approach)
2. AI queue Redis'e taşıma
3. Cron loglarını veritabanına yazma
4. Configuration management geliştirme

### Aşama 3: Performans Optimizasyonu (1-2 hafta)
1. LRU cache kütüphanesine geçiş
2. Connection pooling optimize edilmesi
3. Query optimization ve index review

### Aşama 4: Test Coverage Artırımı (2-3 hafta)
1. Admin routes testleri
2. Cron job testleri
3. Security testleri genişletme

### Aşama 5: Dokümantasyon (1 hafta)
1. API dokümantasyonu güncelleme
2. Admin panel kullanım kılavuzu
3. Deployment dokümantasyonu

---

## 8. ÖZET METRİKLER

| Kategori | Yüksek | Orta | Düşük | Toplam |
|----------|--------|------|-------|--------|
| Güvenlik | 3 | 3 | 1 | 7 |
| Mimari | 2 | 2 | 0 | 4 |
| Performans | 2 | 1 | 0 | 3 |
| Kod Hataları | 1 | 2 | 0 | 3 |
| Test Kapsamı | 2 | 1 | 0 | 3 |
| Dokümantasyon | 1 | 2 | 0 | 3 |
| **Toplam** | **11** | **11** | **1** | **23** |

---

## 9. RİSK DEĞERLENDİRMESİ

| Risk Seviyesi | Sorun Sayısı | Etki Alanı |
|---------------|--------------|------------|
| 🔴 Kritik | 11 | Üretim ortamı, kullanıcı verisi, yetkilendirme |
| 🟠 Yüksek | 11 | Ölçeklenebilirlik, bakım, geliştirme hızı |
| 🟡 Orta | 1 | Geliştirici deneyimi |

**Önerilen Öncelik:** Güvenlik > Mimari > Performans > Test > Dokümantasyon

---

*Rapor Kilo Code AI tarafından 2026-03-01 tarihinde otomatik olarak oluşturulmuştur.*
