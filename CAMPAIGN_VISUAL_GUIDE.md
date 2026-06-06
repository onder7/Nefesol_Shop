# 🎨 Kampanya Görünüş Türleri - Visual Guide

## 📋 Hızlı Referans

| Tip | Konum | Boyut | Geri Sayım | Interactive | Best For |
|-----|-------|-------|-----------|------------|----------|
| **Sticky** | Sayfanın üstünde sabit | Minimal (çubuk) | Evet | Kapatılabilir | ⏰ Acil duyurular |
| **Banner** | İçerik içinde tam genişlik | Büyük (hero) | Evet | Kapatılabilir | 🎯 Ana promosyonlar |
| **Badge** | Ürün kartlarında | Küçük (etiket) | İsteğe bağlı | Tıklanabilir | 🏷️ Ürün indirimler |

---

## 🎯 STICKY - Sabit Üst Çubuk

### Nasıl Görünür?

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ ⚡ Yazlık İndirim | %-50 İndirim   03:12:45   [Şimdi Gör] ✕ ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
┌─────────────────────────────────────────────────────────────┐
│                       SAYFA İÇERİĞİ                         │
│                      (Header, Ürünler vb)                   │
│                                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Özellikler

✅ **Position:** Sticky (sayfanın en üstünde kalır)  
✅ **Background:** Gradient (renk seçimine göre)  
✅ **Height:** ~44px (minimal)  
✅ **Zap Icon:** Soldaki ikon  
✅ **Content:**
- Kampanya adı (bold)
- Ayırıcı (|)
- İndirim metni
- Geri sayım (center)
- CTA butonu (sağ, isteğe bağlı)
- Kapatma X (sağ en uç)

✅ **Mobile:** Wrap & truncate (ekran dar ise metin kesilir)  
✅ **Dark Mode:** Gradient darken edilir  
✅ **Kapanabilir:** X butonuyla kapat, sayfa yenilenmezse geri gel

### Renk Örnekleri

```
Primary (İndigo):
┌─────────────────────────────────────────────────────────────┐
│ ⚡ Yazlık İndirim | %-50 İndirim   03:12:45   [Şimdi Gör] ✕ │
└─────────────────────────────────────────────────────────────┘
Background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)

Success (Yeşil):
┌─────────────────────────────────────────────────────────────┐
│ ⚡ Sipariş Hediye | Ücretsiz Kargo  08:45:30   [Hemen Al] ✕ │
└─────────────────────────────────────────────────────────────┘
Background: linear-gradient(135deg, #10B981 0%, #047857 100%)

Danger (Kırmızı):
┌─────────────────────────────────────────────────────────────┐
│ ⚡ Son Gün! | %-70 Kısıtlı Stok    00:59:15   [Satın Al] ✕ │
└─────────────────────────────────────────────────────────────┘
Background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%)

Warning (Sarı):
┌─────────────────────────────────────────────────────────────┐
│ ⚡ Flash Sale | +₺500 Alışveriş      02:30:00   [Başla] ✕   │
└─────────────────────────────────────────────────────────────┘
Background: linear-gradient(135deg, #EAB308 0%, #CA8A04 100%)
```

---

## 🎨 BANNER - Tam Genişlik Banner

### Nasıl Görünür?

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  ⚡ YAZLIK KOLEKSIYONU                                      │
│  %-50 İndirim                                              │
│  Seçili ürünlerde maksimum indirim fırsatı!              │
│                                                 03:12:45     │
│                                             ┌─────────────┐  │
│                                             │ Şimdi Gör   │  │
│                                             └─────────────┘  │
│                                                  ✕           │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Desktop Layout (3 Kolonu)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ⚡ YAZLIK KOL...                 03:12:45    [Şimdi Gör] ✕     │
│  %-50 İndirim                     02:30:00                     │
│  En iyi ürünlerde...              01:45:30                     │
│                                                                 │
│  [CTA Button]                                                   │
│                                                                 │
│  (Background: Gradient + Dekorasyonlar)                        │
└─────────────────────────────────────────────────────────────────┘
```

### Mobile Layout (Stacked)

```
┌─────────────────────────────────┐
│ ⚡ YAZLIK KOLEKSIYONU         ✕ │
│ %-50 İndirim                   │
│ En iyi ürünlerde...            │
│                                │
│      03:12:45 Gün Kaldı        │
│      02:30:45 Saat             │
│      01:45:30 Dakika           │
│      15 Saniye                 │
│                                │
│     [Şimdi Gör Butonu]         │
│                                │
└─────────────────────────────────┘
```

### Özellikler

✅ **Width:** 100% (tam sayfa genişliği)  
✅ **Padding:** 48px desktop, 32px mobile  
✅ **Border Radius:** 16px  
✅ **Columns:** 2 (info + geri sayım)  
✅ **Info Bölümü:**
- Icon (Zap) + kampanya adı
- H2 başlık (indirim metni) — 40px
- P açıklama — 18px
- CTA button (isteğe bağlı)

✅ **Countdown Box:**
- Her biri 4 grid bölümü
- Arka plan: white/10 + blur
- Border: white/20
- Geri sayım (Gün, Saat, Dakika, Saniye)

✅ **Background:** Dekoratif şekiller (circles)  
✅ **Shadow:** Large shadow (shadow-2xl)  

### Renk Örnekleri

```
Primary (İndigo):
┌──────────────────────────────────────────────────────────┐
│ [Gradient: İndigo → Mor] [Dekoratif şekiller]          │
│ ⚡ YAZLIK KOLEKSIYONU              03:12:45 ✕           │
│ %-50 İndirim                      [Countdown Box]       │
│ En iyi ürünlerde...               02:30:00              │
│ [Şimdi Gör Butonu]                01:45:30              │
└──────────────────────────────────────────────────────────┘

Success (Yeşil):
┌──────────────────────────────────────────────────────────┐
│ [Gradient: Yeşil] [Dekoratif şekiller]                 │
│ ⚡ ÜCRETSİZ KARGO                 08:45:30 ✕           │
│ Tüm ürünlerde                     [Countdown Box]       │
│ Hemen sipariş ver!                07:30:00              │
│ [Başla Butonu]                    06:45:30              │
└──────────────────────────────────────────────────────────┘

Danger (Kırmızı):
┌──────────────────────────────────────────────────────────┐
│ [Gradient: Kırmızı] [Dekoratif şekiller]               │
│ ⚡ SON ÇAĞRISIDIR!                 00:59:15 ✕           │
│ %-70 İndirim                      [Countdown Box]       │
│ Stok tükenmek üzere               00:59:00              │
│ [Şimdi Satın Al Butonu]           00:58:30              │
└──────────────────────────────────────────────────────────┘
```

---

## 🏷️ BADGE - Ürün Kartında Etiket

### Nasıl Görünür?

#### Desktop
```
┌─────────────────────────┐
│    [Ürün Resmi]        │  ⚡ %-50 İndirim
│    (hover: scale-102)  │
│                        │
│ [Favori Butonu]        │
│   (sağ üst)            │
│                        │
└─────────────────────────┘
Kategori Adı
Ürün Adı (1 satır)
Badge'ler (gri background, rounded)
Fiyat: 99,99₺
```

#### Mobile
```
┌──────────────────┐
│ [Ürün Resmi]   │ ⚡ %-50
│                │
│                │
│ [Favori]       │
└──────────────────┘
Kategori Adı
Ürün Adı
⚡ %-50 İndirim
99,99₺
```

### Özellikler

✅ **Position:** Ürün kartının sağında  
✅ **Display:** Inline-flex (yan yana)  
✅ **Icon:** Zap (12px)  
✅ **Text:** Discount text  
✅ **Padding:** 6px 12px  
✅ **Border Radius:** Full (pill-shaped)  
✅ **Font:** Bold, sm (14px)  
✅ **Gap:** 6px (icon + text arası)  
✅ **Shadow:** Subtle shadow  
✅ **Geri Sayım:** < 24 saat kaldıysa göster  
✅ **Multiple Badges:** Çoklu badge desteği  

### Çoklu Badge Örneği

```
┌─────────────────────────┐
│    [Ürün Resmi]        │
│                        │
│                        │
│ [Favori Butonu]        │
└─────────────────────────┘
Kategori Adı

Ürün Adı (1 satır)

⚡ %-50 İndirim   ⚡ +50₺ Bonus

Fiyat: 99,99₺
```

### Renk Örnekleri

```
Primary (İndigo):
┌─────────────────────────┐
│ [Ürün Resmi]           │ [İndigo Gradient]
│                        │ ⚡ %-50 İndirim
└─────────────────────────┘

Success (Yeşil):
┌─────────────────────────┐
│ [Ürün Resmi]           │ [Yeşil Gradient]
│                        │ ⚡ Ücretsiz Kargo
└─────────────────────────┘

Danger (Kırmızı):
┌─────────────────────────┐
│ [Ürün Resmi]           │ [Kırmızı Gradient]
│                        │ ⚡ Son Gün
└─────────────────────────┘

Warning (Sarı):
┌─────────────────────────┐
│ [Ürün Resmi]           │ [Sarı Gradient]
│                        │ ⚡ Flash Sale
└─────────────────────────┘
```

---

## 🔄 Kampanya Yaşam Döngüsü

```
┌─────────────────────────────────────────────────────────────┐
│ Admin Panelinde Kampanya Oluştur                            │
│ (displayType: sticky / banner / badge)                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Başlama Tarihi = Bugün                                      │
│ → CampaignDisplay API'den çeker                             │
│ → Sticky/Banner render edilir                              │
│ → Ürün kartlarında badge gösterilir                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Kampanya Aktif (startDate < now < endDate)                 │
│ → Geri sayım güncellenir (her saniye)                      │
│ → Kullanıcı X butonuyla kapatabilir                        │
│ → Sayfa yenilenirse geri gelir                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Bitiş Tarihi - 1 saat: Uyarı rengi (optional)              │
│ → Geri sayım kırmızı olabilir                              │
│ → "Son saatler!" mesajı gösterilebilir                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Bitiş Tarihi = Şimdi                                        │
│ → Kampanya otomatik gizlenir                               │
│ → Badge'ler kaldırılır                                     │
│ → Sonraki kampanya varsa gösterilir                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Admin Panelinde Sil (İsteğe bağlı)                         │
│ → Hemen frontend'den kaldırılır                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 📱 Responsive Kırılım Noktaları

### Sticky

```
Mobile (< 640px):
⚡ Yazlık | %-50    09:12    [Gör]✕

Tablet (640px - 1024px):
⚡ Yazlık İndirim | %-50 İndirim   09:12:45   [İndirimlileri Gör]✕

Desktop (> 1024px):
⚡ Yazlık İndirim | %-50 İndirim   09:12:45   [İndirimlileri Gör]✕
```

### Banner

```
Mobile (< 640px):
┌──────────────────────────────┐
│ ⚡ YAZLIK KOL.            ✕  │
│ %-50 İndirim                 │
│ En iyi ürünlerde...          │
│       Geri Sayım             │
│    [Şimdi Gör]               │
└──────────────────────────────┘

Tablet (640px - 1024px):
┌────────────────────────────────────────┐
│ ⚡ YAZLIK KOLEKSIYONU   Geri Sayım  ✕ │
│ %-50 İndirim           [Box]       │
│ En iyi ürünlerde...    [Box]       │
│ [Şimdi Gör Button]     [Box]       │
└────────────────────────────────────────┘

Desktop (> 1024px):
┌────────────────────────────────────────────┐
│ ⚡ YAZLIK KOLEKSIYONU      Geri Sayım  ✕ │
│ %-50 İndirim              [Box][Box]   │
│ En iyi ürünlerde...       [Box][Box]   │
│ [Şimdi Gör Button]                     │
└────────────────────────────────────────────┘
```

### Badge

```
Mobile:
⚡ %-50 İndirim
(Tam genişlik, alt satır)

Tablet & Desktop:
⚡ %-50 İndirim  ⚡ +50₺
(İlişkili, yan yana)
```

---

## 🎯 Seçim Rehberi

### Hangi Türü Seçmeliyim?

**STICKY Seç Eğer:**
- ⏰ Zamanı olan kampanya
- 📢 Tüm sayfalarda görülmesi gerek
- ⚡ Acil duyuru
- 💾 Minimal alan kullanmak istiyorsan

**Örnek:** "Son 2 saatte %-70 indirim"

---

**BANNER Seç Eğer:**
- 🎯 Önemli promosyon
- 📝 Açıklamaya ihtiyaç var
- 🎨 Görsel impact istiyorsan
- 📱 Ana sayfada öne çıkarmak istiyorsan

**Örnek:** "Yazlık Koleksiyonumuz Açıldı! %-50 indirim"

---

**BADGE Seç Eğer:**
- 🏷️ Ürün-spesifik indirim
- 🎁 Özel ürünler için
- 📊 Batch ürün sunumları
- 🔄 Dinamik gösterim istiyorsan

**Örnek:** Belirli ürünlerde "%-50 İndirim" etiketleri

---

## 🌗 Dark Mode Desteği

Tüm bileşenler dark mode destekler:

```
Dark Mode Örneği:
┌─────────────────────────────────────┐
│ ⚡ YAZLIK KOLEKSIYONU            ✕  │  (Dark arka plan, açık metin)
│ %-50 İndirim                       │
│ En iyi ürünlerde...                │
│      [Geri Sayım Kutuları]         │
│     [CTA Button - Açık]            │
└─────────────────────────────────────┘
```

---

## ✨ Animasyonlar

```
Sticky/Banner Giriş:
0ms:    opacity: 0, translateY: -10px
300ms:  opacity: 1, translateY: 0

Kapatma:
0ms:    opacity: 1
300ms:  opacity: 0 (remove)

Badge Giriş:
Hazır (no animation)

Geri Sayım Güncelleme:
Hazır (no flashing)
```

---

**Version:** 1.0  
**Last Updated:** 2026-06-06
