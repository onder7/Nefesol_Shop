# 📢 Kampanya Görünüş Sistemi (Campaign Display Guide)

## 📋 Genel Bakış

Frontend'de 3 farklı kampanya görünüş türü uygulanmıştır:

| Tip | Lokasyon | Kullanım | Görünüm |
|-----|----------|----------|--------|
| **Sticky** | Sayfanın üst kısmında sabit | Zamanına duyarlı kampanyalar | Minimal çubuk, geri sayım vurgulu |
| **Banner** | Ana içerik alanında tam genişlik | Önemli duyurular | Büyük başlık, açıklama, şık gradient |
| **Badge** | Ürün kartlarında | Ürün-spesifik indirimler | Küçük etiket, Zap ikonu |

---

## 🏗️ Mimarisi

```
frontend/src/components/common/CampaignDisplay.tsx
├── CampaignDisplay()       // Ana bileşen (sticky + banner)
├── CampaignBadges()        // Ürün kartları için badge'ler
├── StickyBar()             // Sabit üst çubuk
├── CampaignBanner()        // Tam genişlik banner
└── CampaignBadge()         // Tek badge bileşeni
```

---

## 🎨 Renkler (COLOR_STYLES)

Admin panelinde seçilebilen 4 renk:

```typescript
const COLOR_STYLES = {
  primary:  'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',  // İndigo
  success:  'linear-gradient(135deg, #10B981 0%, #047857 100%)',  // Yeşil
  danger:   'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)',  // Kırmızı
  warning:  'linear-gradient(135deg, #EAB308 0%, #CA8A04 100%)',  // Sarı
};
```

---

## 🔧 Kullanım

### 1️⃣ **App.tsx'e CampaignDisplay Ekleme** (Zaten yapıldı)

```tsx
import { CampaignDisplay } from '@/components/common/CampaignDisplay';

function AppContent() {
  return (
    <div className="min-h-screen flex flex-col">
      <ScrollToTop />
      <CampaignDisplay />  {/* ← Sticky/Banner kampanyaları göster */}
      {!isAuthPage && <Header />}
      {/* ... routes ... */}
    </div>
  );
}
```

### 2️⃣ **Ürün Kartlarına Badge Ekleme** (Zaten yapıldı)

```tsx
import { CampaignBadges } from '@/components/common/CampaignDisplay';

export function ProductCard({ product }: Props) {
  return (
    <Link to={`/urun/${product.slug}`}>
      {/* ... resim ve diğer içerik ... */}
      
      {/* Kampanya Badgeleri */}
      <div className="mt-0.5">
        <CampaignBadges productId={product.id} />
      </div>
      
      {/* ... fiyat ... */}
    </Link>
  );
}
```

---

## 📊 Veri Akışı

### Sticky/Banner Kampanyaları:
```
1. App açılır
   ↓
2. CampaignDisplay mount edilir
   ↓
3. GET /api/campaigns?isActive=true çağrılır
   ↓
4. Kampanyalar yüklenir (endDate'ine göre filtre)
   ↓
5. Türüne göre render (sticky/banner gösterilir)
   ↓
6. Her saniye geri sayım güncellenir
   ↓
7. Süre dolunca otomatik kapat
```

### Badge Kampanyaları:
```
1. CampaignDisplay badge kampanyaları
   data-badge-campaigns attribute'una ekler
   ↓
2. ProductCard render edilir
   ↓
3. CampaignBadges bileşeni
   registry'den kampanyaları alır
   ↓
4. Badge render edilir
```

---

## 🎯 Admin Panelinde Ayarlar

### Kampanya Oluştur / Düzenle

**Ana Form Alanları:**
```
Kampanya Adı ................. "Yazlık Koleksiyonu"
İndirim Metni ............... "%-50 İndirim"
Açıklama .................... "Seçili ürünlerde..."
İndirim Miktarı ............ 50
İndirim Tipi .............. Percentage / Fixed
Başlama Tarihi ............. 2024-06-01
Bitiş Tarihi ............... 2024-06-30
Görünüş Tipi .............. sticky / banner / badge
Renk ...................... primary / success / danger / warning
CTA Buton Metni ........... "İndirimlileri Gör"
CTA Linki ................. "/kampanya/yazlik"
Aktif ..................... ☑️
Ana Sayfada Göster ........ ☐
```

---

## 🖼️ Görünüm Örnekleri

### STICKY (Sabit Çubuk)
```
┌─────────────────────────────────────────────────────┐
│ ⚡ Yazlık İndirim | %-50 İndirim    12:34:56 İndirimlileri Gör ✕ │
└─────────────────────────────────────────────────────┘
```

### BANNER (Tam Genişlik)
```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  ⚡ YAZLIK KOLEKSIYONU                                      │
│  %-50 İndirim                                              │
│  Seçili ürünlerde maksimum indirim fırsatı!              │
│                                                   12:34:56   │
│                              ┌──────────────┐  ┌─────┐      │
│                              │ İndirimlileri│  │  ✕  │      │
│                              └──────────────┘  └─────┘      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### BADGE (Ürün Kartında)
```
┌─────────────────────────┐
│    [Ürün Görseli]      │
│                        │
│                        │  ⚡ %-50 İndirim
└─────────────────────────┘
Kategori
Ürün Adı
Fiyat: 99,99₺
```

---

## ⚙️ API Endpoints

### Kampanyaları Getir
```bash
GET /api/campaigns
GET /api/campaigns?isActive=true
GET /api/campaigns?showOnHome=true
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "cuid...",
      "name": "Yazlık İndirim",
      "discountText": "%-50 İndirim",
      "displayType": "sticky",
      "color": "primary",
      "startDate": "2024-06-01T00:00:00Z",
      "endDate": "2024-06-30T23:59:59Z",
      "isActive": true,
      "ctaText": "İndirimlileri Gör",
      "ctaLink": "/kampanya/yazlik",
      "products": [
        { "product": { "id": "...", "name": "..." } }
      ]
    }
  ]
}
```

---

## 🔄 Geri Sayım Mantığı

```typescript
function getTimeLeft(endDate: Date): TimeLeft {
  const diff = endDate.getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1_000),
  };
}
```

- **Her saniye** güncellenir
- **Kampanya sona erdikçe** otomatik gizlenir
- **Görünüş kapatılabilir** (X butonuyla)

---

## 📱 Responsive Tasarım

### Desktop
- **Sticky**: 3 bölüm (sol: adı, orta: geri sayım, sağ: CTA)
- **Banner**: 3 sütun layout
- **Badge**: İkon + metin

### Mobile
- **Sticky**: Wrap ve truncate (ekseni dikey değilse)
- **Banner**: Stacked, daha dar
- **Badge**: Tam genişlik badge'ler

---

## 🎬 Animasyonlar

- **Sticky/Banner Giriş**: Yumuşak geçiş
- **Geri Sayım**: Anlık update (takip eden animasyon yok, ancak sabit yazı tipi)
- **Kapatma**: Fade out (300ms)

---

## ✅ Test Checklist

### Admin Panelinde:
- [ ] Sticky kampanya oluştur, görünür mü?
- [ ] Banner kampanya oluştur, görünür mü?
- [ ] Badge kampanya oluştur, ürün kartında görünür mü?
- [ ] Farklı renkler test et
- [ ] Bitiş tarihi geçmiş kampanya otomatik gizleniyor mu?
- [ ] CTA linki çalışıyor mu?

### Frontend'de:
- [ ] Kampanya geri sayımı doğru mü?
- [ ] X butonuyla kapatılabiliyor mu?
- [ ] Sayfayı yenileyince tekrar görünüyor mu?
- [ ] Mobilde responsive mı?
- [ ] Koyu tema desteği var mı?

---

## 🐛 Troubleshooting

### Kampanya Görünmüyor
1. **isActive: true** olup olmadığını kontrol et
2. **startDate** bugünden önce mi?
3. **endDate** bugünden sonra mı?
4. **displayType** "sticky", "banner", "badge" mi?

### Badge Görünmüyor
1. **data-badge-campaigns** attribute'u sayfa'da var mı?
2. CampaignBadges bileşeni ProductCard'da render ediliyor mu?
3. Ürün bir kampanyaya eklendi mi?

### Geri Sayım Durmuş Görünüyor
1. Browser console'da hata var mı?
2. Network request başarılı mı?
3. Sistem saati doğru mu?

---

## 📝 Gelecek Geliştirmeler

- [ ] **Home Page Carousel**: showOnHome kampanyalarını ana sayfada carousel olarak göster
- [ ] **Ürün Sayfası**: Ürün detay sayfasında kampanya badge'i daha belirgin göster
- [ ] **Kategori Sayfası**: Kategori banner'ı aktif kampanyalar için
- [ ] **Email Notifikasyonları**: Kampanya başladığında müşteri bildirimi
- [ ] **Analytics**: Kampanya tıklama/dönüşüm oranları
- [ ] **Scheduling**: İleri tarihe kampanya planla

---

## 📞 İletişim

Kampanya sistemi hakkında sorular için admin panelinin Kampanyalar bölümünü ziyaret et.
