# ✅ Kampanya Görünüş Sistemi - Implementasyon Özeti

## 📦 Oluşturulan Dosyalar

### 1. **CampaignDisplay Component** 
**Dosya:** `frontend/src/components/common/CampaignDisplay.tsx`

**Fonksiyonlar:**
- `CampaignDisplay()` - Ana bileşen (sticky + banner kampanyaları)
- `CampaignBadges()` - Ürün kartlarında gösterilecek badge'ler
- `StickyBar()` - Sabit üst çubuk
- `CampaignBanner()` - Tam genişlik kampanya banner'ı
- `CampaignBadge()` - Tekil badge bileşeni

**Renkler (4 seçenek):**
```
primary  → İndigo gradient
success  → Yeşil gradient
danger   → Kırmızı gradient
warning  → Sarı gradient
```

---

### 2. **CampaignCarousel Component** 
**Dosya:** `frontend/src/components/home/CampaignCarousel.tsx`

**Özellikler:**
- Ana sayfada gösterilecek kampanya karusel
- `showOnHome=true` kampanyaları göster
- 6 saniyede otomatik geçiş
- Önceki/Sonraki butonları
- Sayfa göstergesi (dots)
- Responsive tasarım

---

### 3. **Rehber Dosyası**
**Dosya:** `CAMPAIGN_DISPLAY_GUIDE.md`

Kapsamlı kullanım rehberi, API detayları, troubleshooting

---

## 🔧 Yapılan Değişiklikler

### Frontend App.tsx
```diff
- import { DiscountBanner } from '@/components/common/DiscountBanner';
+ import { CampaignDisplay } from '@/components/common/CampaignDisplay';

- {isHomePage && <DiscountBanner />}
+ <CampaignDisplay />
```

### Frontend ProductCard.tsx
```diff
+ import { CampaignBadges } from '@/components/common/CampaignDisplay';

  {/* Kampanya Badgeleri */}
+ <div className="mt-0.5">
+   <CampaignBadges productId={product.id} />
+ </div>
```

---

## 🎯 Kampanya Türleri & Görünüm

### 1. **STICKY** - Sabit Üst Çubuk
**Kullanım:** Önemli, zamanın yapısında kampanyalar

**Özellikler:**
```
✓ Sayfa üstünde sabit (sticky positioning)
✓ Kompakt tasarım (minimal alan)
✓ Geri sayım vurgulu (saat:dakika:saniye)
✓ İkon (Zap) + Kampanya adı + İndirim metni
✓ CTA butonu (isteğe bağlı)
✓ Kapatma butonu (X)
```

**Admin'de Seç:** `displayType: "sticky"`

**Örnek:**
```
⚡ Yazlık İndirim | %-50 İndirim     03:12:45      [İndirimlileri Gör] ✕
```

---

### 2. **BANNER** - Tam Genişlik Banner
**Kullanım:** Önemli duyurular, sunumlar

**Özellikler:**
```
✓ Tam sayfa genişliğinde
✓ Büyük başlık + açıklama
✓ Gradient arka plan (seçili renk)
✓ Dekoratif background şekilleri
✓ Geri sayım (daha belirgin)
✓ CTA butonu
✓ Kapatma butonu
```

**Admin'de Seç:** `displayType: "banner"`

**Responsive:**
- Desktop: 3 kolonu (info, sayaç, buton)
- Mobile: Stacked layout

---

### 3. **BADGE** - Ürün Kartında Etiket
**Kullanım:** Ürün-spesifik indirimler

**Özellikler:**
```
✓ Ürün kartında gösterilir
✓ Küçük, göze çarpan tasarım
✓ Zap ikonu + indirim metni
✓ Sağa dayalı alignment
✓ Otomatik çoklu badge desteği
✓ Geri sayım (eğer < 24 saat kaldıysa)
```

**Admin'de Seç:** `displayType: "badge"`

**Örnek Ürün Kartı:**
```
┌─────────────────┐
│  [Ürün Resmi]   │ ⚡ %-50 İndirim
│                 │
└─────────────────┘
Kategori
Ürün Adı
99,99₺
```

---

## 📋 Adım Adım Kullanım

### **Adım 1: Admin Panelinde Kampanya Oluştur**

1. Admin panelinde **Kampanyalar** bölümüne git
2. **+ Yeni Kampanya** butonuna tıkla
3. Formu doldur:
   - **Kampanya Adı:** "Yazlık Koleksiyonu"
   - **İndirim Metni:** "%-50 İndirim"
   - **Açıklama:** "Seçili ürünlerde..."
   - **İndirim Miktarı:** 50
   - **İndirim Tipi:** Percentage / Fixed
   - **Başlama Tarihi:** Bugünün tarihi
   - **Bitiş Tarihi:** 7 gün sonrası
   - **Görünüş Tipi:** `sticky` veya `banner` (ilk gösterim için)
   - **Renk:** `primary` seç
   - **CTA Buton Metni:** "İndirimlileri Gör"
   - **CTA Linki:** "/kampanya/yazlik"
   - ✓ Aktif
   - ☐ Ana Sayfada Göster (sticky/banner için)

4. **Kaydet** butonuna tıkla

5. Opsiyonel: **Ürün Ekle** butonu ile ürünleri seç

### **Adım 2: Frontend'de Göster**

**Sticky/Banner Kampanyaları:**
- Otomatik olarak sayfanın en üstünde gösterilir
- Hiçbir kod değişikliği gerekli değil ✓

**Badge Kampanyaları:**
- Ürün kartlarında otomatik olarak gösterilir
- Hiçbir kod değişikliği gerekli değil ✓

**Ana Sayfa Karusel:** (Opsiyonel)
```tsx
// frontend/src/pages/Home.tsx içinde ekle:

import { CampaignCarousel } from '@/components/home/CampaignCarousel';

export function Home() {
  return (
    <div>
      <BannerSlider />
      <Categories />
      <CampaignCarousel />  {/* ← Buraya ekle */}
      <FeaturedProducts />
    </div>
  );
}
```

---

## 🔄 Veri Akışı

### API Çağrıları

```
GET /api/campaigns
├── isActive=true      → Aktif kampanyaları getir
├── showOnHome=true    → Ana sayfada gösterilecekleri getir
└── Response:
    {
      "success": true,
      "data": [
        {
          "id": "...",
          "name": "Yazlık İndirim",
          "displayType": "sticky",
          "color": "primary",
          "discountText": "%-50 İndirim",
          "startDate": "2024-06-01T00:00:00Z",
          "endDate": "2024-06-30T23:59:59Z",
          "ctaText": "İndirimlileri Gör",
          "ctaLink": "/kampanya/yazlik"
        }
      ]
    }
```

---

## 🎨 CSS & Responsive

**Tailwind ile entegre:**
- Dark mode desteği (dark:*)
- Responsive breakpoints (sm:, md:, lg:)
- Backdrop blur & opacity
- Smooth transitions

**Breakpoints:**
- **Mobile:** < 640px (sm)
- **Tablet:** 640px - 1024px (md)
- **Desktop:** > 1024px (lg)

---

## ⏰ Geri Sayım Yönetimi

```typescript
// Kampanya sona ermeden X saniye öncesinde:
// → Geri sayım gösterilir

// Kampanya sona erdiğinde:
// → Otomatik gizlenir
// → Başka kampanya varsa sonrakine geçer
// → Hiç kampanya kalmazsa hiçbir şey gösterilmez
```

**Her saniye:**
- Geri sayım güncellenir
- Süresi dolan kampanyalar kaldırılır

---

## ✅ Test Listesi

### Admin Paneli
- [ ] Sticky kampanya oluştur → Frontend'de gösterilir mi?
- [ ] Banner kampanya oluştur → Doğru şekilde gösterilir mi?
- [ ] Badge kampanya oluştur → Ürün kartında gösterilir mi?
- [ ] Farklı renkleri test et
- [ ] CTA linki çalışıyor mu?
- [ ] Kampanyayı silerse otomatik gizleniyor mu?

### Frontend
- [ ] Sticky kampanya X ile kapatılabiliyor mu?
- [ ] Banner kampanya X ile kapatılabiliyor mu?
- [ ] Sayfayı yenileyince geri geliyor mu?
- [ ] Geri sayım doğru mu? (her saniye güncellenme)
- [ ] Badge'ler ürün kartında görünüyor mu?
- [ ] Mobilde responsive mi?
- [ ] Dark theme'de iyi görünüyor mu?

### Timing
- [ ] 1 saat önce oluşturulan kampanya gösterilir mi?
- [ ] 5 dakika sonra bitecek kampanya gösterilir mi?
- [ ] Süresi dolmuş kampanya gizleniyor mu?
- [ ] 6 saatlik kampanya badge olarak gösterilir mi?

---

## 🚀 Bonus: Ana Sayfa Karusel Kullanımı

`showOnHome=true` olan kampanyaları ana sayfada karusel olarak göstermek için:

```tsx
// frontend/src/pages/Home.tsx

import { CampaignCarousel } from '@/components/home/CampaignCarousel';

export function Home() {
  return (
    <>
      {/* ... diğer içerik ... */}
      <CampaignCarousel />  {/* Aktif & showOnHome kampanyaları */}
      {/* ... diğer içerik ... */}
    </>
  );
}
```

**Özellikleri:**
- 6 saniyede otomatik geçiş
- Önceki/Sonraki butonları
- Sayfa göstergesi (dots)
- Kalan gün bilgisi
- Responsive tasarım
- Dark mode desteği

---

## 🐛 Sık Sorunlar & Çözümler

### Kampanya Görünmüyor
**Sebepleri:**
- [ ] Admin'de `isActive: true` mi?
- [ ] `endDate` bugünden sonra mı?
- [ ] `displayType` doğru mu? (sticky, banner, badge)
- [ ] API `GET /api/campaigns` başarılı mı? (Network tab'da kontrol et)

### Badge Ürün Kartında Görünmüyor
- [ ] Kampanya `displayType: badge` mi?
- [ ] Ürün kampanyaya eklendi mi?
- [ ] ProductCard'da CampaignBadges bileşeni var mı?

### Geri Sayım Durmuş
- [ ] Browser console'da hata var mı?
- [ ] Sistem saati doğru mu?
- [ ] Network connection aktif mi?

---

## 📊 Dosya Ağacı

```
frontend/
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   └── CampaignDisplay.tsx          ← Ana bileşen
│   │   └── home/
│   │       └── CampaignCarousel.tsx         ← Karusel (opsiyonel)
│   ├── pages/
│   │   ├── Home.tsx                         ← Karusel eklemek için
│   │   └── CampaignDetail.tsx               ← Kampanya detay sayfası
│   └── App.tsx                              ← CampaignDisplay çağrısı
├── CAMPAIGN_DISPLAY_GUIDE.md                ← Detaylı rehber
└── CAMPAIGN_IMPLEMENTATION_SUMMARY.md       ← Bu dosya
```

---

## 🎯 Sonraki Adımlar

1. **Test:** Kampanya oluştur ve Frontend'de test et
2. **Karusel:** İstemsen Home.tsx'e CampaignCarousel ekle
3. **Styling:** Kendi tema renklerini COLOR_STYLES'a ekle (gerekirse)
4. **Analytics:** Kampanya tıklama/dönüşüm oranlarını izle

---

**Version:** 1.0  
**Tarih:** 2026-06-06  
**Durum:** ✅ Tamamlandı & Test Hazır
