● Plan dosyasına kapsamlı component listesini yazdım. İçerik:

  Toplam ~40 Component 6 fazda organize edildi:
  ┌─────┬──────────────────────────────────────────────────────┬──────────────────┐
  │ Faz │                        İçerik                        │ Component Sayısı │
  ├─────┼──────────────────────────────────────────────────────┼──────────────────┤
  │ 1   │ Core (ArticleCard, AlignmentDot, EmotionBar...)      │ 6                │
  ├─────┼──────────────────────────────────────────────────────┼──────────────────┤
  │ 2   │ Article Detail (Header, PoliticalGauge, Analysis...) │ 5                │
  ├─────┼──────────────────────────────────────────────────────┼──────────────────┤
  │ 3   │ Interactions (Comments, Voting...)                   │ 4                │
  ├─────┼──────────────────────────────────────────────────────┼──────────────────┤
  │ 4   │ Feed Variations (Balanced, Filters)                  │ 2                │
  ├─────┼──────────────────────────────────────────────────────┼──────────────────┤
  │ 5   │ Digest & Profile                                     │ 6                │
  ├─────┼──────────────────────────────────────────────────────┼──────────────────┤
  │ 6   │ Sources                                              │ 3                │
  └─────┴──────────────────────────────────────────────────────┴──────────────────┘
  Her component için:

- Hangi veri alanları gelecek
- Nasıl görselleştirilecek
- Component hiyerarşisi

────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 Ready to code?

 Here is Claude's plan:
╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
 Haber Uygulaması - Component Listesi ve Veri Mapping

 Genel Bakış

 Bu döküman, database şemasına dayalı olarak gerekli tüm UI componentlerini ve her componente hangi verilerin
 geleceğini tanımlar.

 ---

 1. ARTICLE CARD (Feed Listesi)

Dosya: components/ArticleCard.tsx (mevcut, güncellenmeli)
 ┌──────────────────────────┬────────────────────┬────────────────────────────────────┐
 │        Veri Alanı        │       Görsel       │              Açıklama              │
 ├──────────────────────────┼────────────────────┼────────────────────────────────────┤
 │ sources[0].sourceLogoUrl │ Logo resmi         │ Kaynak logosu                      │
 ├──────────────────────────┼────────────────────┼────────────────────────────────────┤
 │ sources[0].sourceName    │ Text               │ Kaynak adı                         │
 ├──────────────────────────┼────────────────────┼────────────────────────────────────┤
 │ publishedAt              │ "2 saat önce"      │ Zaman damgası                      │
 ├──────────────────────────┼────────────────────┼────────────────────────────────────┤
 │ govAlignmentScore        │ Renkli nokta       │ -5 ile +5 arası (kırmızı/gri/sarı) │
 ├──────────────────────────┼────────────────────┼────────────────────────────────────┤
 │ translatedTitle          │ Bold text          │ Başlık (1 satır)                   │
 ├──────────────────────────┼────────────────────┼────────────────────────────────────┤
 │ summary                  │ Normal text        │ Özet (2 satır)                     │
 ├──────────────────────────┼────────────────────┼────────────────────────────────────┤
 │ governmentMentioned      │ Badge              │ "Hükümet" etiketi                  │
 ├──────────────────────────┼────────────────────┼────────────────────────────────────┤
 │ emotionalIntensity       │ Badge              │ Yüksekse uyarı göster              │
 ├──────────────────────────┼────────────────────┼────────────────────────────────────┤
 │ viewCount                │ Göz ikonu + sayı   │ Görüntülenme                       │
 ├──────────────────────────┼────────────────────┼────────────────────────────────────┤
 │ commentCount             │ Yorum ikonu + sayı │ Yorum sayısı                       │
 └──────────────────────────┴────────────────────┴────────────────────────────────────┘
 ---

 1. ARTICLE DETAIL SCREEN

 2.1 ArticleHeader
 ┌────────────────────────────┬─────────────────────┐
 │            Veri            │       Görsel        │
 ├────────────────────────────┼─────────────────────┤
 │ translatedTitle            │ Büyük başlık        │
 ├────────────────────────────┼─────────────────────┤
 │ publishedAt                │ Tarih/saat          │
 ├────────────────────────────┼─────────────────────┤
 │ viewCount                  │ Görüntülenme sayısı │
 ├────────────────────────────┼─────────────────────┤
 │ categoryId → Category name │ Kategori badge      │
 └────────────────────────────┴─────────────────────┘
 2.2 SourceInfoBar
 ┌─────────────────────────────┬──────────────────────────────────────────┐
 │            Veri             │                  Görsel                  │
 ├─────────────────────────────┼──────────────────────────────────────────┤
 │ sources[].sourceLogoUrl     │ Logo grid                                │
 ├─────────────────────────────┼──────────────────────────────────────────┤
 │ sources[].sourceName        │ Kaynak adları                            │
 ├─────────────────────────────┼──────────────────────────────────────────┤
 │ sources[].govAlignmentScore │ Alignment dot per source                 │
 ├─────────────────────────────┼──────────────────────────────────────────┤
 │ sources[].govAlignmentLabel │ "İktidara Yakın" / "Muhalefete Yakın" vs │
 ├─────────────────────────────┼──────────────────────────────────────────┤
 │ sourceCount                 │ "X kaynaktan derlendi"                   │
 └─────────────────────────────┴──────────────────────────────────────────┘
 2.3 ArticleContent
 ┌──────────────────────────────┬─────────────────────────────┐
 │             Veri             │           Görsel            │
 ├──────────────────────────────┼─────────────────────────────┤
 │ originalContent veya summary │ Makale metni                │
 ├──────────────────────────────┼─────────────────────────────┤
 │ sources[0].sourceUrl         │ "Orijinal habere git" linki │
 └──────────────────────────────┴─────────────────────────────┘
 2.4 ReactionBar
 ┌──────────────┬─────────────────────────┐
 │     Veri     │         Görsel          │
 ├──────────────┼─────────────────────────┤
 │ likeCount    │ Beğeni butonu + sayı    │
 ├──────────────┼─────────────────────────┤
 │ dislikeCount │ Beğenmeme butonu + sayı │
 ├──────────────┼─────────────────────────┤
 │ userReaction │ Aktif buton state       │
 ├──────────────┼─────────────────────────┤
 │ isBookmarked │ Kaydet butonu state     │
 ├──────────────┼─────────────────────────┤
 │ Share action │ Paylaş butonu           │
 └──────────────┴─────────────────────────┘
 2.5 PoliticalToneGauge

 [-5 -------- 0 -------- +5]
  Muhalefet   Nötr    İktidar
 ┌─────────────────────┬───────────────────────────────────┐
 │        Veri         │              Görsel               │
 ├─────────────────────┼───────────────────────────────────┤
 │ politicalTone       │ Slider/gauge pozisyonu (-5 to +5) │
 ├─────────────────────┼───────────────────────────────────┤
 │ politicalConfidence │ "% güvenilirlik" badge            │
 ├─────────────────────┼───────────────────────────────────┤
 │ governmentMentioned │ "Hükümet/siyaset içeriği" flag    │
 └─────────────────────┴───────────────────────────────────┘
 2.6 EmotionalAnalysisCard
 ┌────────────────────────┬───────────────────────────┐
 │          Veri          │          Görsel           │
 ├────────────────────────┼───────────────────────────┤
 │ emotionalTone.anger    │ Kızgınlık bar (0-100%)    │
 ├────────────────────────┼───────────────────────────┤
 │ emotionalTone.fear     │ Korku bar                 │
 ├────────────────────────┼───────────────────────────┤
 │ emotionalTone.joy      │ Sevinç bar                │
 ├────────────────────────┼───────────────────────────┤
 │ emotionalTone.sadness  │ Üzüntü bar                │
 ├────────────────────────┼───────────────────────────┤
 │ emotionalTone.surprise │ Şaşkınlık bar             │
 ├────────────────────────┼───────────────────────────┤
 │ emotionalIntensity     │ Genel yoğunluk (0-1)      │
 ├────────────────────────┼───────────────────────────┤
 │ dominantEmotion        │ "Baskın duygu: Kızgınlık" │
 ├────────────────────────┼───────────────────────────┤
 │ loadedLanguageScore    │ "Yüklü dil skoru" bar     │
 ├────────────────────────┼───────────────────────────┤
 │ sensationalismScore    │ "Sansasyonellik" bar      │
 └────────────────────────┴───────────────────────────┘
 2.7 ContentQualityBadges
 ┌─────────────┬───────────────────────────────────┐
 │    Veri     │              Görsel               │
 ├─────────────┼───────────────────────────────────┤
 │ isClickbait │ Uyarı badge (true ise)            │
 ├─────────────┼───────────────────────────────────┤
 │ isAd        │ "Reklam" badge (true ise)         │
 ├─────────────┼───────────────────────────────────┤
 │ sentiment   │ Emoji (positive/neutral/negative) │
 └─────────────┴───────────────────────────────────┘
 2.8 PerspectivesSection

 Aynı haber farklı kaynaklardan:
 ┌─────────────────────────────────────────┬───────────────┐
 │                  Veri                   │    Görsel     │
 ├─────────────────────────────────────────┼───────────────┤
 │ relatedPerspectives[].sourceName        │ Kaynak adı    │
 ├─────────────────────────────────────────┼───────────────┤
 │ relatedPerspectives[].sourceLogoUrl     │ Logo          │
 ├─────────────────────────────────────────┼───────────────┤
 │ relatedPerspectives[].title             │ Başlık        │
 ├─────────────────────────────────────────┼───────────────┤
 │ relatedPerspectives[].govAlignmentScore │ Alignment dot │
 ├─────────────────────────────────────────┼───────────────┤
 │ relatedPerspectives[].similarityScore   │ "% benzerlik" │
 └─────────────────────────────────────────┴───────────────┘
 2.9 AlignmentVotingWidget

Kullanıcı geri bildirimi:
 ┌───────────────────────────┬─────────────────────────────────────────────────┐
 │           Veri            │                     Görsel                      │
 ├───────────────────────────┼─────────────────────────────────────────────────┤
 │ Current govAlignmentScore │ Mevcut skor gösterimi                           │
 ├───────────────────────────┼─────────────────────────────────────────────────┤
 │ Vote buttons              │ "Katılıyorum" / "Katılmıyorum" / "Emin değilim" │
 ├───────────────────────────┼─────────────────────────────────────────────────┤
 │ suggestedScore input      │ Kullanıcı önerisi (-5 to +5 slider)             │
 └───────────────────────────┴─────────────────────────────────────────────────┘
 ---

 1. COMMENTS SECTION

3.1 CommentThread
 ┌────────────────────────────┬──────────────────────────┐
 │            Veri            │          Görsel          │
 ├────────────────────────────┼──────────────────────────┤
 │ comments[].content         │ Yorum metni              │
 ├────────────────────────────┼──────────────────────────┤
 │ comments[].createdAt       │ Zaman                    │
 ├────────────────────────────┼──────────────────────────┤
 │ comments[].likeCount       │ Beğeni sayısı            │
 ├────────────────────────────┼──────────────────────────┤
 │ comments[].replies[]       │ Nested yorumlar (indent) │
 ├────────────────────────────┼──────────────────────────┤
 │ comments[].parentCommentId │ Thread bağlantısı        │
 └────────────────────────────┴──────────────────────────┘
 3.2 CommentForm
 ┌───────────────┬──────────────────────────┐
 │     Veri      │          Görsel          │
 ├───────────────┼──────────────────────────┤
 │ Text input    │ Yorum yazma alanı        │
 ├───────────────┼──────────────────────────┤
 │ Submit button │ "Gönder" butonu          │
 ├───────────────┼──────────────────────────┤
 │ Reply context │ Yanıtlanan yorum preview │
 └───────────────┴──────────────────────────┘
 3.3 CommentCard
 ┌──────────────┬────────────────┐
 │     Veri     │     Görsel     │
 ├──────────────┼────────────────┤
 │ User avatar  │ Profil resmi   │
 ├──────────────┼────────────────┤
 │ User name    │ Kullanıcı adı  │
 ├──────────────┼────────────────┤
 │ content      │ Yorum metni    │
 ├──────────────┼────────────────┤
 │ likeCount    │ Beğeni + buton │
 ├──────────────┼────────────────┤
 │ createdAt    │ "2 saat önce"  │
 ├──────────────┼────────────────┤
 │ Reply button │ "Yanıtla"      │
 └──────────────┴────────────────┘
 ---

 1. FEED SCREENS

 4.1 NormalFeedScreen
 ┌──────────────────┬───────────────────────────┐
 │    Component     │           Veri            │
 ├──────────────────┼───────────────────────────┤
 │ FeedHeader       │ Ülke seçici, filtre       │
 ├──────────────────┼───────────────────────────┤
 │ ArticleCard list │ articles[] from useFeed() │
 ├──────────────────┼───────────────────────────┤
 │ Infinite scroll  │ pagination.hasMore        │
 ├──────────────────┼───────────────────────────┤
 │ Pull-to-refresh  │ refetch()                 │
 └──────────────────┴───────────────────────────┘
 4.2 BalancedFeedScreen

3 sütunlu görünüm:
 ┌───────┬───────────┬────────────┐
 │ Sütun │   Veri    │    Renk    │
 ├───────┼───────────┼────────────┤
 │ Sol   │ antiGov[] │ Indigo/Mor │
 ├───────┼───────────┼────────────┤
 │ Orta  │ mixed[]   │ Gri        │
 ├───────┼───────────┼────────────┤
 │ Sağ   │ proGov[]  │ Amber/Sarı │
 └───────┴───────────┴────────────┘
 4.3 FeedFilterBar
 ┌──────────────────┬───────────────────────────────────────┐
 │       Veri       │                Görsel                 │
 ├──────────────────┼───────────────────────────────────────┤
 │ Feed type toggle │ Normal / Balanced                     │
 ├──────────────────┼───────────────────────────────────────┤
 │ Category filter  │ Dropdown (Politika, Ekonomi, Spor...) │
 ├──────────────────┼───────────────────────────────────────┤
 │ Sort options     │ En yeni / En çok okunan               │
 └──────────────────┴───────────────────────────────────────┘
 ---

 1. DAILY DIGEST

5.1 DigestHeader
 ┌──────────────┬───────────────────────────────┐
 │     Veri     │            Görsel             │
 ├──────────────┼───────────────────────────────┤
 │ digestDate   │ "23 Ocak 2026"                │
 ├──────────────┼───────────────────────────────┤
 │ period       │ "Sabah Özeti" / "Akşam Özeti" │
 ├──────────────┼───────────────────────────────┤
 │ articleCount │ "45 haberden derlendi"        │
 └──────────────┴───────────────────────────────┘
 5.2 DigestSummary
 ┌─────────────┬──────────────────────────┐
 │    Veri     │          Görsel          │
 ├─────────────┼──────────────────────────┤
 │ summaryText │ AI özet metni (paragraf) │
 └─────────────┴──────────────────────────┘
 5.3 TopicsGrid
 ┌─────────────────────────┬───────────────────┐
 │          Veri           │      Görsel       │
 ├─────────────────────────┼───────────────────┤
 │ topTopics[].title       │ Konu başlığı      │
 ├─────────────────────────┼───────────────────┤
 │ topTopics[].description │ Kısa açıklama     │
 ├─────────────────────────┼───────────────────┤
 │ topTopics[].articleId   │ Tıklanabilir link │
 └─────────────────────────┴───────────────────┘
 5.4 DigestComments
 ┌──────────────────────────────────────────┬─────────────────────────┐
 │                   Veri                   │         Görsel          │
 ├──────────────────────────────────────────┼─────────────────────────┤
 │ Comments with targetType: 'daily_digest' │ CommentThread component │
 └──────────────────────────────────────────┴─────────────────────────┘
 ---

 1. SOURCE COMPONENTS

6.1 SourceCard
 ┌────────────────────────┬───────────────────────────────┐
 │          Veri          │            Görsel             │
 ├────────────────────────┼───────────────────────────────┤
 │ sourceName             │ Kaynak adı                    │
 ├────────────────────────┼───────────────────────────────┤
 │ sourceLogoUrl          │ Logo                          │
 ├────────────────────────┼───────────────────────────────┤
 │ govAlignmentScore      │ Alignment gauge (-5 to +5)    │
 ├────────────────────────┼───────────────────────────────┤
 │ govAlignmentLabel      │ "İktidara Yakın" vs           │
 ├────────────────────────┼───────────────────────────────┤
 │ govAlignmentConfidence │ "% güvenilirlik"              │
 ├────────────────────────┼───────────────────────────────┤
 │ govAlignmentNotes      │ Açıklama metni                │
 ├────────────────────────┼───────────────────────────────┤
 │ biasScoreUser          │ Kullanıcı oylaması ortalaması │
 ├────────────────────────┼───────────────────────────────┤
 │ biasVoteCount          │ "X kullanıcı oyladı"          │
 └────────────────────────┴───────────────────────────────┘
 6.2 SourceAlignmentHistory
 ┌──────────────────────────────┬─────────────────────────────────────┐
 │             Veri             │               Görsel                │
 ├──────────────────────────────┼─────────────────────────────────────┤
 │ alignmentHistory[].oldScore  │ Eski skor                           │
 ├──────────────────────────────┼─────────────────────────────────────┤
 │ alignmentHistory[].newScore  │ Yeni skor                           │
 ├──────────────────────────────┼─────────────────────────────────────┤
 │ alignmentHistory[].reason    │ Değişiklik nedeni                   │
 ├──────────────────────────────┼─────────────────────────────────────┤
 │ alignmentHistory[].updatedAt │ Tarih                               │
 ├──────────────────────────────┼─────────────────────────────────────┤
 │ alignmentHistory[].updatedBy │ "Admin" / "AI" / "Kullanıcı oyları" │
 └──────────────────────────────┴─────────────────────────────────────┘
 6.3 FollowSourceButton
 ┌──────────────────┬──────────────────────────────────┐
 │       Veri       │              Görsel              │
 ├──────────────────┼──────────────────────────────────┤
 │ isFollowed state │ "Takip Et" / "Takiptesin" toggle │
 └──────────────────┴──────────────────────────────────┘
 ---

 1. USER PROFILE

 7.1 ProfileHeader
 ┌────────────────────┬─────────────────────┐
 │        Veri        │       Görsel        │
 ├────────────────────┼─────────────────────┤
 │ name               │ Kullanıcı adı       │
 ├────────────────────┼─────────────────────┤
 │ email              │ Email               │
 ├────────────────────┼─────────────────────┤
 │ avatarUrl          │ Profil resmi        │
 ├────────────────────┼─────────────────────┤
 │ subscriptionStatus │ "Premium" badge     │
 ├────────────────────┼─────────────────────┤
 │ createdAt          │ "Üyelik: Ocak 2024" │
 └────────────────────┴─────────────────────┘
 7.2 ReputationCard
 ┌────────────────────┬───────────────────────────────────┐
 │        Veri        │              Görsel               │
 ├────────────────────┼───────────────────────────────────┤
 │ reputationScore    │ Skor (0-1) → yıldız veya seviye   │
 ├────────────────────┼───────────────────────────────────┤
 │ totalVotes         │ "Toplam X oy"                     │
 ├────────────────────┼───────────────────────────────────┤
 │ accurateVotes      │ "X doğru tahmin"                  │
 ├────────────────────┼───────────────────────────────────┤
 │ accuracyPercentage │ "% isabetlilik"                   │
 ├────────────────────┼───────────────────────────────────┤
 │ level              │ "Bronz" / "Gümüş" / "Altın" badge │
 └────────────────────┴───────────────────────────────────┘
 7.3 NotificationPreferences

Her biri toggle switch:
 ┌───────────────────────┬────────────────────────────┐
 │         Veri          │           Görsel           │
 ├───────────────────────┼────────────────────────────┤
 │ notifFollowedSources  │ "Takip ettiğim kaynaklar"  │
 ├───────────────────────┼────────────────────────────┤
 │ notifDailyDigest      │ "Günlük özet"              │
 ├───────────────────────┼────────────────────────────┤
 │ notifWeeklyComparison │ "Haftalık karşılaştırma"   │
 ├───────────────────────┼────────────────────────────┤
 │ notifBreakingNews     │ "Son dakika"               │
 ├───────────────────────┼────────────────────────────┤
 │ notifComments         │ "Yorum bildirimleri"       │
 ├───────────────────────┼────────────────────────────┤
 │ notifAlignmentChanges │ "Alignment değişiklikleri" │
 └───────────────────────┴────────────────────────────┘
 7.4 CategoryPreferences
 ┌─────────────────────┬───────────────┐
 │        Veri         │    Görsel     │
 ├─────────────────────┼───────────────┤
 │ Categories list     │ Checkbox grid │
 ├─────────────────────┼───────────────┤
 │ Selected categories │ Highlighted   │
 └─────────────────────┴───────────────┘
 7.5 FollowedSourcesList
 ┌───────────────────┬────────────────────┐
 │       Veri        │       Görsel       │
 ├───────────────────┼────────────────────┤
 │ followedSources[] │ SourceCard listesi │
 ├───────────────────┼────────────────────┤
 │ Unfollow button   │ Her kaynak için    │
 └───────────────────┴────────────────────┘
 7.6 BookmarksList
 ┌─────────────────┬─────────────────────┐
 │      Veri       │       Görsel        │
 ├─────────────────┼─────────────────────┤
 │ bookmarks[]     │ ArticleCard listesi │
 ├─────────────────┼─────────────────────┤
 │ Remove bookmark │ Swipe action        │
 └─────────────────┴─────────────────────┘
 7.7 ReadingHistory
 ┌───────────────────────────────────┬─────────────────┐
 │               Veri                │     Görsel      │
 ├───────────────────────────────────┼─────────────────┤
 │ readingHistory[].articleId        │ Article preview │
 ├───────────────────────────────────┼─────────────────┤
 │ readingHistory[].viewedAt         │ "Dün okundu"    │
 ├───────────────────────────────────┼─────────────────┤
 │ readingHistory[].timeSpentSeconds │ "5 dk okuma"    │
 └───────────────────────────────────┴─────────────────┘
 ---

 1. SHARED/UTILITY COMPONENTS

 8.1 AlignmentDot

 Props: score (-5 to +5)
 Renk:
   score <= -1 → Indigo (Muhalefet)
   score == 0  → Gri (Nötr)
   score >= +1 → Amber (İktidar)

 8.2 AlignmentGauge

 [-5 ----●---- +5]
 Visual slider showing political position

 8.3 EmotionBar

 Props: emotion (string), value (0-1)
 Horizontal progress bar with label

 8.4 ConfidenceBadge

 Props: confidence (0-1)
 Shows "85%" style pill badge

 8.5 TimeAgo

 Props: timestamp
 Returns: "2 saat önce", "Dün", etc.

 8.6 LoadingSpinner

 Feed yüklenirken gösterilir

 8.7 EmptyState

 Props: message, icon
 "Henüz haber yok" gibi durumlar için

 8.8 ErrorState

 Props: message, retryAction
 API hatası durumları için

 ---

 1. COMPONENT HİYERARŞİSİ

 App
 ├── TabNavigator
 │   ├── FeedTab
 │   │   ├── FeedHeader
 │   │   ├── FeedFilterBar
 │   │   └── ArticleCard[] (FlatList)
 │   │
 │   ├── DigestTab
 │   │   ├── DigestHeader
 │   │   ├── DigestSummary
 │   │   ├── TopicsGrid
 │   │   └── DigestComments
 │   │
 │   ├── SourcesTab
 │   │   └── SourceCard[] (kategorilere göre)
 │   │
 │   └── ProfileTab
 │       ├── ProfileHeader
 │       ├── ReputationCard
 │       ├── BookmarksList
 │       └── Settings (Preferences)
 │
 └── Modals/Screens
     ├── ArticleDetailScreen
     │   ├── ArticleHeader
     │   ├── SourceInfoBar
     │   ├── ArticleContent
     │   ├── ReactionBar
     │   ├── PoliticalToneGauge
     │   ├── EmotionalAnalysisCard
     │   ├── PerspectivesSection
     │   ├── AlignmentVotingWidget
     │   └── CommentsSection
     │
     ├── BalancedFeedScreen
     │   └── 3-column layout
     │
     └── SourceDetailScreen
         ├── SourceCard (expanded)
         └── SourceAlignmentHistory

 ---

 1. ÖNCELİK SIRASI (Geliştirme)

 Faz 1: Core Components (Temel)

 1. ArticleCard - güncelle (mevcut)
 2. AlignmentDot - yeni
 3. AlignmentGauge - yeni
 4. EmotionBar - yeni
 5. ReactionBar - yeni
 6. TimeAgo - utility

 Faz 2: Article Detail

 1. ArticleHeader
 2. SourceInfoBar
 3. PoliticalToneGauge
 4. EmotionalAnalysisCard
 5. PerspectivesSection

 Faz 3: Interactions

 1. CommentCard
 2. CommentThread
 3. CommentForm
 4. AlignmentVotingWidget

 Faz 4: Feed Variations

 1. BalancedFeedScreen
 2. FeedFilterBar

 Faz 5: Digest & Profile

 1. DigestHeader, DigestSummary, TopicsGrid
 2. ProfileHeader, ReputationCard
 3. NotificationPreferences
 4. BookmarksList, ReadingHistory

 Faz 6: Sources

 1. SourceCard
 2. SourceAlignmentHistory
 3. FollowSourceButton

 ---

 1. DOĞRULAMA

 Her component için:

 1. Mock data ile izole test
 2. Gerçek API ile entegrasyon testi
 3. Dark mode uyumluluğu
 4. Loading/Error state'leri
 5. Accessibility (erişilebilirlik)

 ---
 NOTLAR

- Tüm alignment renkleri: Indigo (muhalefet), Gri (nötr), Amber (iktidar)
- Emotional analysis 5 duygu: anger, fear, joy, sadness, surprise
- Confidence skorları 0-1 arasında, UI'da % olarak göster
- Political tone -5 ile +5 arasında integer

---

## 10. EKSİK COMPONENTLER (DB Şemasından Eklendi)

### 10.1 ArticlePollCard

**Tablo: `{country}_article_polls`**
┌──────────────────┬────────────────────────────────┐
│       Veri       │            Görsel              │
├──────────────────┼────────────────────────────────┤
│ question         │ Anket sorusu                   │
├──────────────────┼────────────────────────────────┤
│ options[]        │ Seçenekler (Radio/Checkbox)    │
├──────────────────┼────────────────────────────────┤
│ results{}        │ Sonuç bar grafikleri           │
├──────────────────┼────────────────────────────────┤
│ totalVotes       │ "X kişi oyladı"                │
├──────────────────┼────────────────────────────────┤
│ expiresAt        │ "X saat kaldı" badge           │
└──────────────────┴────────────────────────────────┘

### 10.2 TrendingTopics

**Tablo: `topics`**
┌──────────────────┬────────────────────────────────┐
│       Veri       │            Görsel              │
├──────────────────┼────────────────────────────────┤
│ name             │ Konu adı                       │
├──────────────────┼────────────────────────────────┤
│ hashtag          │ #hashtag                       │
├──────────────────┼────────────────────────────────┤
│ articleCount     │ "X haber"                      │
├──────────────────┼────────────────────────────────┤
│ trendingScore    │ Trending flame ikonu           │
└──────────────────┴────────────────────────────────┘

### 10.3 WeeklyComparisonCard

**Tablo: `weekly_comparisons`**
┌────────────────────┬────────────────────────────────┐
│        Veri        │            Görsel              │
├────────────────────┼────────────────────────────────┤
│ weekStart/weekEnd  │ "15-22 Ocak" tarih aralığı     │
├────────────────────┼────────────────────────────────┤
│ countriesData{}    │ Ülke karşılaştırma grafiği     │
├────────────────────┼────────────────────────────────┤
│ comparisonText     │ AI karşılaştırma özeti         │
├────────────────────┼────────────────────────────────┤
│ commentCount       │ Yorum sayısı                   │
└────────────────────┴────────────────────────────────┘

### 10.4 NotificationItem

**Tablo: `notifications`**
┌──────────────────┬────────────────────────────────┐
│       Veri       │            Görsel              │
├──────────────────┼────────────────────────────────┤
│ type             │ İkon (news/digest/breaking...) │
├──────────────────┼────────────────────────────────┤
│ title            │ Bildirim başlığı               │
├──────────────────┼────────────────────────────────┤
│ body             │ Bildirim içeriği               │
├──────────────────┼────────────────────────────────┤
│ isRead           │ Okunmamış badge                │
├──────────────────┼────────────────────────────────┤
│ sentAt           │ "2 saat önce"                  │
└──────────────────┴────────────────────────────────┘

### 10.5 SourceBiasVoting

**Tablo: `source_bias_votes` + `source_alignment_votes`**
┌─────────────────────┬────────────────────────────────┐
│        Veri         │            Görsel              │
├─────────────────────┼────────────────────────────────┤
│ Current biasScore   │ Mevcut bias skoru gauge        │
├─────────────────────┼────────────────────────────────┤
│ User vote input     │ Slider (-5 to +5)              │
├─────────────────────┼────────────────────────────────┤
│ voteType            │ Agree/Disagree/Unsure buttons  │
├─────────────────────┼────────────────────────────────┤
│ suggestedScore      │ Önerilen skor input            │
├─────────────────────┼────────────────────────────────┤
│ comment             │ Opsiyonel yorum alanı          │
└─────────────────────┴────────────────────────────────┘

---

## 11. GÜNCEL COMPONENT SAYISI

| Faz | Açıklama | Component |
|-----|----------|-----------|
| 1 | Core (ArticleCard, AlignmentDot...) | 6 |
| 2 | Article Detail (Header, PoliticalGauge...) | 9 |
| 3 | Interactions (Comments, Voting...) | 4 |
| 4 | Feed Variations (Balanced, Filters) | 3 |
| 5 | Digest & Profile | 10 |
| 6 | Sources | 3 |
| 7 | Polls & Topics | 2 |
| 8 | Notifications & Weekly | 2 |
| 9 | Shared/Utility | 8 |
| **TOPLAM** | | **~47** |

---

## 12. VERİ AKIŞI ÖZETİ

```
Backend API Response → React Query Hook → Component Props → UI Render
```

### Article Detail Örnek Akış

```
GET /feed/tr/:articleId
    ↓
{
  id, translatedTitle, summary,
  politicalTone, politicalConfidence, governmentMentioned,
  emotionalTone: {anger, fear, joy, sadness, surprise},
  emotionalIntensity, loadedLanguageScore, sensationalismScore,
  isClickbait, isAd, sentiment,
  sources: [{sourceName, govAlignmentScore, govAlignmentLabel}],
  viewCount, likeCount, dislikeCount, commentCount
}
    ↓
<ArticleDetailScreen>
  ├── <ArticleHeader title={translatedTitle} />
  ├── <SourceInfoBar sources={sources} />
  ├── <PoliticalToneGauge score={politicalTone} />
  ├── <EmotionalAnalysisCard emotions={emotionalTone} />
  ├── <ContentQualityBadges isClickbait={isClickbait} />
  ├── <ReactionBar likes={likeCount} />
  └── <CommentsSection articleId={id} />
</ArticleDetailScreen>
```

╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌
