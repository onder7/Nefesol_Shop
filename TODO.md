# ✅ E-Ticaret Projesi — TODO Yol Haritası

> Her aşama bağımsız olarak tamamlanabilir şekilde tasarlanmıştır.
> Önce sunucu kurulumu, sonra geliştirme ortamı, ardından özellik geliştirme.

---

## 🖥️ AŞAMA 0 — Sunucu Hazırlığı (VDS / Ubuntu 25)

> **Bu adımları sırayla yapalım. Geliştirmeye başlamadan önce sunucu stabil olmalı.**

### 0.1 — Temel Sunucu Güvenliği
Sunucu bilgileri:
ip  adresi : 109.236.48.221
Kullanıcı: root
Şifre: 4cde68bf0a6ehostivon



- [x] SSH ile root olarak bağlan, yeni sudo kullanıcısı oluştur
  ```bash
  adduser deploy
  usermod -aG sudo deploy
  şifre : =nd3r1379!1Qa
  ```
- [x] SSH key-based authentication kur, root SSH girişini kapat
  ```bash
  # /etc/ssh/sshd_config
  PermitRootLogin no
  PasswordAuthentication no
  ```
- [x] UFW (Uncomplicated Firewall) kur ve yapılandır
  ```bash
  ufw allow 22/tcp      # SSH
  ufw allow 80/tcp      # HTTP
  ufw allow 443/tcp     # HTTPS
  ufw enable
  ```
- [x] Fail2ban kur (brute-force koruması)
  ```bash
  apt install fail2ban -y
  ```
- [x] Otomatik güvenlik güncellemelerini etkinleştir
  ```bash
  apt install unattended-upgrades -y
  dpkg-reconfigure --priority=low unattended-upgrades
  ```
- [x] Sunucu saatini ayarla (timezone: Europe/Istanbul)
  ```bash
  timedatectl set-timezone Europe/Istanbul
  ```
- [x] Swap alanı oluştur (RAM yetersizse)
  ```bash
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  ```

### 0.2 — Docker & Docker Compose Kurulumu
- [x] Docker Engine kur (Ubuntu 25 için resmi repo)
  ```bash
  apt-get update
  apt-get install ca-certificates curl gnupg
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update
  apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin -y
  ```
- [x] `deploy` kullanıcısını docker grubuna ekle
  ```bash
  usermod -aG docker deploy
  ```
- [x] Docker servisini otomatik başlatmaya al
  ```bash
  systemctl enable docker
  systemctl start docker
  ```
- [x] Docker kurulumunu doğrula
  ```bash
  docker --version
  docker compose version
  docker run hello-world
  ```

### 0.3 — Git Kurulumu & Proje İskeleti
- [x] Git kur https://github.com/onder7/mabridgeglobal
  ```bash
  apt install git -y
  git config --global user.name "Adın"
  git config --global user.email "email@domain.com"
  ```
- [x] Proje dizinini oluştur
  ```bash
  mkdir -p /var/www/ecommerce
  chown deploy:deploy /var/www/ecommerce
  cd /var/www/ecommerce
  git init
  ```
- [x] GitHub/GitLab'a SSH key ekle (CI/CD için)
  ```bash
  ssh-keygen -t ed25519 -C "deploy@sunucu"
  cat ~/.ssh/id_ed25519.pub  # Bu key'i GitHub'a ekle
  ```

### 0.4 — Nginx Kurulumu & SSL
- [x] Nginx kur (Docker dışı, host seviyesinde)
  ```bash
  apt install nginx -y
  systemctl enable nginx
  ```
- [ ] Domain'i sunucu IP'sine yönlendir (DNS A kaydı)
- [ ] Certbot ile Let's Encrypt SSL al
  ```bash
  apt install certbot python3-certbot-nginx -y
  certbot --nginx -d domain.com -d www.domain.com -d admin.domain.com
  ```
- [ ] SSL otomatik yenileme doğrula
  ```bash
  certbot renew --dry-run
  ```
- [ ] Nginx yapılandırma dosyaları oluştur (geliştirme aşamasında placeholder)

### 0.5 — Node.js Kurulumu (Lokal geliştirme için)
- [ ] Node.js 20 LTS kur (nvm ile)
  ```bash
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  source ~/.bashrc
  nvm install 20
  nvm use 20
  nvm alias default 20
  ```
- [ ] pnpm veya npm'i doğrula
  ```bash
  node --version   # v20.x.x olmalı
  npm --version
  ```

### 0.6 — PostgreSQL & Redis (Docker ile test)
- [ ] Test amaçlı tek konteyner ayağa kaldır
  ```bash
  # PostgreSQL test
  docker run -d --name pg-test \
    -e POSTGRES_USER=ecom \
    -e POSTGRES_PASSWORD=test123 \
    -e POSTGRES_DB=ecommerce \
    -p 5432:5432 postgres:16-alpine

  # Redis test
  docker run -d --name redis-test \
    -p 6379:6379 redis:7-alpine

  # Bağlantıları doğrula
  docker exec -it pg-test psql -U ecom -d ecommerce -c "\l"
  docker exec -it redis-test redis-cli ping   # PONG dönmeli
  ```
- [ ] Test konteynerlerini temizle
  ```bash
  docker stop pg-test redis-test
  docker rm pg-test redis-test
  ```

### 0.7 — Monitoring Araçları (Opsiyonel ama önerilen)
- [ ] Portainer kur (Docker yönetim arayüzü)
  ```bash
  docker run -d -p 9000:9000 \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v portainer_data:/data \
    --name portainer --restart=always \
    portainer/portainer-ce:latest
  ```
- [ ] UFW'de Portainer portunu sadece belirli IP'ye aç
  ```bash
  ufw allow from SENIN_IP to any port 9000
  ```

---

## 🎨 AŞAMA 1.0 — Frontend Tasarım Kararı (Başlamadan Oku)

> **Hazır HTML/CSS/JS tema kullanmıyoruz. React ile sıfırdan yazıyoruz.**

### Neden hazır HTML tema değil?

| Sorun | Açıklama |
|-------|----------|
| State yönetimi yok | Sepet, auth, filtreler için jQuery hack gerekir |
| React ile çakışma | İki ayrı DOM yönetim sistemi aynı anda çalışır |
| TypeScript desteği yok | Tip güvenliği sağlanamaz |
| Bakım kabusuna dönüşür | Her özellik eklemede daha fazla monkey-patch |
| Vite pipeline ile uyumsuz | Build süreci karmaşıklaşır |

### Doğru yaklaşım: Hibrit Yöntem

- **Tasarım referansı:** Themeforest / ThemeWagon'dan HTML tema satın al veya ücretsiz bak. Sadece ekran görüntüsü, renk paleti ve font ilhamı için kullan. Kodu kopyalama.
- **Bileşen temeli:** shadcn/ui — ücretsiz, React, TypeScript, Tailwind. 50+ hazır bileşen (Button, Input, Dialog, Table, Form...). Kaynak kodu doğrudan projeye kopyalanır, dışa bağımlılık yok.
- **İkonlar:** Lucide React — SVG tabanlı, React component, tree-shaking destekli.
- **Admin grafikleri:** Recharts — React-native, TypeScript.

### Tasarım referansı için önerilen kaynaklar

- [Themeforest E-commerce](https://themeforest.net/category/site-templates/ecommerce) — ücretli, kaliteli
- [ThemeWagon](https://themewagon.com/theme-category/ecommerce/) — ücretsiz seçenekler
- [Storefront (WooCommerce)](https://woocommerce.com/storefront/) — layout ilhamı için
- Referans olarak beğenilen sitenin renk paletini ve font seçimini Tailwind config'e yaz

---

## 🏗️ AŞAMA 1 — Proje İskeleti & Docker Compose

- [x] Monorepo dizin yapısını oluştur (`frontend/`, `admin/`, `backend/`)
- [x] `docker-compose.yml` yaz (tüm servisleri tanımla)
- [ ] Her servis için `Dockerfile` oluştur
- [x] `.env.example` dosyası hazırla
- [x] `.gitignore` ve `.dockerignore` dosyaları ekle
- [x] Backend: Express + TypeScript temel kurulum
  ```bash
  cd backend && npm init -y
  npm install express typescript ts-node @types/node @types/express
  npx tsc --init
  ```
- [x] Frontend: Vite + React + TypeScript kurulum
  ```bash
  npm create vite@latest frontend -- --template react-ts
  cd frontend && npm install
  npm install -D tailwindcss postcss autoprefixer
  npx tailwindcss init -p
  ```
- [x] Frontend: shadcn/ui kur ve yapılandır
  ```bash
  cd frontend
  npx shadcn@latest init
  # Prompted sorulara: TypeScript=yes, style=default, baseColor=slate, cssVariables=yes
  ```
- [x] Frontend: Temel shadcn/ui bileşenlerini ekle
  ```bash
  npx shadcn@latest add button input card badge dialog
  npx shadcn@latest add table form select textarea
  npx shadcn@latest add dropdown-menu sheet toast
  ```
- [x] Frontend: Diğer paketleri kur
  ```bash
  npm install lucide-react                   # İkon kütüphanesi
  npm install @tanstack/react-query          # Server state (API cache)
  npm install react-router-dom               # Routing
  npm install zustand                        # Client state (sepet, auth)
  npm install axios                          # API çağrıları
  npm install react-hook-form                # Form yönetimi
  npm install @hookform/resolvers zod        # Form validasyon
  npm install clsx tailwind-merge            # Koşullu className
  npm install swiper                         # Slider/carousel
  npm install react-image-gallery            # Ürün görseli galerisi
  ```
- [ ] Admin: Vite + React + TypeScript kurulum (ayrı uygulama)
- [ ] Admin: shadcn/ui + admin'e özel paketleri kur
  ```bash
  cd admin
  npx shadcn@latest init
  npx shadcn@latest add button input card badge dialog table form select
  npm install lucide-react recharts          # İkon + grafik
  npm install @tanstack/react-query react-router-dom zustand axios
  npm install react-hook-form @hookform/resolvers zod
  ```
- [x] Prisma ORM kurulumu ve `schema.prisma` taslağı
  ```bash
  cd backend
  npm install @prisma/client
  npm install -D prisma
  npx prisma init
  ```
- [x] İlk `docker-compose up` testi — tüm servisler ayağa kalkmalı

---

## 🔧 AŞAMA 2 — Backend Temel Altyapı

- [x] Express uygulama yapısını kur (controllers/routes/services/middlewares)
- [x] Error handling middleware (merkezi hata yönetimi)
- [x] Logger kurulumu (Winston)
- [x] Zod ile request validation middleware
- [x] PostgreSQL bağlantısı (Prisma client)
- [x] Redis bağlantısı (ioredis)
- [x] Health check endpoint: `GET /api/health`
- [ ] Swagger / OpenAPI dokümantasyonu (swagger-jsdoc + swagger-ui-express)
- [x] Prisma şeması tüm tablolarla tamamla
- [x] İlk migration çalıştır: `npx prisma migrate dev --name init`
- [x] Seed script yaz (test kategorileri, ürünler, admin kullanıcı)
- [x] Rate limiting middleware (express-rate-limit)
- [x] Helmet.js kurulumu
- [x] CORS yapılandırması

---

## 🔐 AŞAMA 3 — Kimlik Doğrulama Sistemi

- [x] `POST /api/auth/register` — kullanıcı kaydı (bcrypt hash)
- [x] `POST /api/auth/login` — JWT access + refresh token üret
- [x] `POST /api/auth/logout` — refresh token geçersiz kıl (Redis blacklist)
- [x] `POST /api/auth/refresh-token` — access token yenile
- [ ] `POST /api/auth/forgot-password` — reset link emaille gönder
- [ ] `POST /api/auth/reset-password` — token doğrula, şifreyi güncelle
- [x] `GET /api/auth/me` — aktif kullanıcı bilgisi
- [x] `PUT /api/auth/profile` — profil güncelle (ad, soyad, telefon)
- [x] `PUT /api/auth/change-password` — şifre değiştir
- [x] JWT middleware (korunan route'lar için)
- [x] Admin role guard middleware
- [x] Frontend: Login / Register sayfaları (shadcn/ui Form + Input + Button)
- [x] Frontend: Auth context ve token yönetimi (Zustand store)
- [x] Frontend: Axios interceptor — her isteğe token ekle, 401'de refresh
- [x] Frontend: Protected route bileşeni

---

## 🛍️ AŞAMA 4 — Ürün Kataloğu

### Backend
- [x] Kategori CRUD API (hiyerarşik yapı destekli)
- [x] Marka CRUD API
- [x] Ürün CRUD API (varyant, görsel, stok dahil)
- [x] Ürün arama API (PostgreSQL full-text search)
- [x] Filtreleme: fiyat aralığı, kategori, marka
- [x] Sayfalama: limit/offset
- [ ] Redis cache: ürün listesi (5 dk TTL)

### Frontend (shadcn/ui tabanlı)
- [x] Ana sayfa (hero banner, featured ürünler API'den, kategoriler)
- [x] Ürün listesi / kategori sayfası (sıralama, sayfalama)
- [x] Ürün arama sayfası
- [x] Sıralama — shadcn/ui Select
- [x] Ürün kartı bileşeni (Badge, stok, indirim)
- [x] Ürün detay sayfası (varyant seçici, miktar, sepete ekle butonu)
- [x] Breadcrumb navigasyonu
- [x] TanStack Query ile API veri çekme

---

## 🛒 AŞAMA 5 — Sepet Sistemi

- [x] Backend: Misafir + üye sepet (session_id veya user_id)
- [x] `GET /api/cart` — sepet getir
- [x] `POST /api/cart/items` — ürün ekle
- [x] `PUT /api/cart/items/:id` — miktar güncelle
- [x] `DELETE /api/cart/items/:id` — ürün kaldır
- [ ] `POST /api/cart/apply-discount` — kupon kodu uygula
- [ ] Redis: sepet verilerini geçici sakla (TTL: 7 gün)
- [x] Giriş yapılınca misafir sepetini birleştir (`POST /api/cart/merge`)
- [x] Frontend: Sepet sayfası
- [ ] Frontend: Mini sepet (header dropdown)
- [x] Frontend: Sepet adedi badge (Header'da itemCount)

---

## 💳 AŞAMA 6 — Checkout & Ödeme

- [x] Backend: Sipariş oluşturma işlemi (transaction ile)
- [x] Adres seçimi / yeni adres ekleme (addressService.ts — CRUD)
- [x] Kargo seçenekleri (49.90₺ sabit, 500₺ üzeri ücretsiz)
- [x] İyziCo entegrasyonu (manual HMAC-SHA1, iyzipay paketi olmadan)
  - [x] Ödeme formu (Checkout Form — 3D Secure destekli)
  - [x] Callback webhook endpoint (`POST /api/checkout/callback`)
  - [x] Ödeme başarılı/başarısız yönetimi + dev bypass modu
- [x] Stok düşme işlemi (atomik — Prisma `$transaction`)
- [x] Sipariş onay emaili (Nodemailer — SMTP yoksa log'a yazar)
- [x] Frontend: Checkout wizard (adres → özet → ödeme)
- [x] Frontend: Sipariş tamamlandı sayfası (OrderSuccess.tsx)

---

## 📦 AŞAMA 7 — Sipariş Yönetimi

- [x] `GET /api/checkout/orders` — kullanıcının siparişleri
- [x] `GET /api/checkout/orders/:id` — sipariş detayı
- [ ] Admin: sipariş durum güncelleme (pending → processing → shipped → delivered)
- [ ] Kargo takip numarası girişi
- [ ] Sipariş durum değişikliğinde email bildirimi
- [x] Frontend: Sipariş geçmişi sayfası (Orders.tsx)
- [x] Frontend: Sipariş detay sayfası (timeline + statusHistory)

---

## ⭐ AŞAMA 8 — Ek Özellikler

- [x] Ürün değerlendirme sistemi (5 yıldız + yorum)
- [x] Favori listesi (wishlist)
- [ ] Ürün karşılaştırma
- [ ] Son görüntülenen ürünler (localStorage + Redis)
- [ ] İndirim/kupon sistemi (yüzde, sabit tutar, min sepet)
- [ ] Bildirim sistemi (sipariş güncellemeleri)
- [x] Kullanıcı profil sayfası (Profile.tsx — ad/soyad/tel + şifre değiştir)
- [x] Soru & Cevap sistemi (ProductQA — misafir soru, admin cevap)
- [x] `POST /api/auth/forgot-password` — şifre sıfırlama linki emaile gönder
- [x] `POST /api/auth/reset-password` — token doğrula, şifreyi güncelle
- [x] Son görüntülenen ürünler (localStorage + zustand/persist)

---

## 🎛️ AŞAMA 9 — Admin Paneli

- [x] Dashboard: KPI kartları (günlük satış, sipariş sayısı, yeni üye)
- [x] Dashboard: Satış grafiği (ApexCharts — son 30 gün)
- [x] Ürün yönetimi: listele, aktif/pasif toggle, öne çıkan toggle, sil
- [ ] Ürün ekleme/düzenleme formu
- [ ] Toplu ürün yükleme (Excel/CSV import)
- [ ] Görsel yükleme (Cloudinary entegrasyonu)
- [ ] Kategori ve marka yönetimi
- [x] Sipariş listesi: filtreleme, durum güncelleme
- [x] Müşteri listesi: görüntüle, aktif/pasif toggle
- [x] Admin login sistemi (JWT, korumalı layout)
- [ ] İndirim yönetimi: kupon oluştur, kullanım raporu
- [ ] Raporlar: satış, ürün, müşteri bazlı
- [ ] Site ayarları: iletişim, kargo ücretleri, SEO

---

## 🚀 AŞAMA 10 — Production Deployment

- [ ] `docker-compose.prod.yml` hazırla (production optimizasyonları)
- [ ] Multi-stage Dockerfile'lar (build + runtime ayrı)
- [ ] Nginx production yapılandırması (gzip, cache-control)
- [ ] SSL sertifikası (Certbot) ve otomatik yenileme cron
- [ ] `.env.production` güvenli şekilde ayarla
- [ ] Veritabanı yedekleme scripti + cron job
  ```bash
  # Her gün 02:00'de yedek al
  0 2 * * * /var/www/ecommerce/scripts/backup.sh
  ```
- [ ] GitHub Actions CI/CD pipeline kur
  ```yaml
  # .github/workflows/deploy.yml
  # main branch push → test → build → SSH ile sunucuya deploy
  ```
- [ ] Uygulama loglarını yapılandır (Docker log driver)
- [ ] Uptime monitoring (UptimeRobot veya Betterstack ücretsiz katman)
- [ ] Lighthouse / performance audit

---

## 🔍 AŞAMA 11 — Test & Kalite

- [ ] Backend unit test altyapısı (Vitest + Supertest)
- [ ] Temel API endpoint testleri (auth, products, orders)
- [ ] Frontend component testleri (React Testing Library)
- [ ] E2E test altyapısı (Playwright) — opsiyonel
- [ ] ESLint + Prettier yapılandırması
- [ ] Husky + lint-staged (commit öncesi kontrol)

---

## 📌 Öncelik Sırası (Önerilen)

```
HEMEN → Aşama 0 (Sunucu kurulumu)
       ↓
       Aşama 1 (Proje iskeleti)
       ↓
       Aşama 2 (Backend altyapı)
       ↓
       Aşama 3 (Auth sistemi)
       ↓
       Aşama 4 (Ürün kataloğu)
       ↓
       Aşama 5 (Sepet)
       ↓
       Aşama 6 (Checkout & Ödeme)
       ↓
       Aşama 7 (Sipariş yönetimi)
       ↓
       Aşama 9 (Admin paneli)   ← paralel geliştirilebilir
       ↓
       Aşama 8 (Ek özellikler) ← en son
       ↓
       Aşama 10 (Production deploy)
       ↓
       Aşama 11 (Test & kalite)
```

---

> 💡 **İlk hedef:** Aşama 0 tamamlanınca, tüm servisler `docker-compose up` ile ayağa kalkmalı.
> Sunucu hazır olduktan sonra geliştirme aşamalarına başlanabilir.

---

## 🎨 Tasarım Referansı Notları

> Bu bölümü proje boyunca güncelle.

| Unsur | Değer | Kaynak |
|-------|-------|--------|
| Primary renk | (referans temadan al) | — |
| Secondary renk | (referans temadan al) | — |
| Font — başlık | (referans temadan al) | — |
| Font — metin | (referans temadan al) | — |
| Referans tema adı | (seçilen tema adı) | Themeforest / ücretsiz |
| Referans tema URL | (link) | — |

Tailwind config'e aktar:
```js
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      primary: {
        DEFAULT: '#BURAYA_YAZ',
        // ...
      }
    },
    fontFamily: {
      sans: ['BURAYA_YAZ', 'sans-serif'],
      display: ['BURAYA_YAZ', 'sans-serif'],
    }
  }
}
```
Aşama 5 (Sepet): 7/11 tamamlandı

Kalan: apply-discount, Redis cache, mini sepet dropdown
Aşama 6 (Checkout & Ödeme): Tümü tamamlandı ✓

Iyzico entegrasyonu (manual), adres yönetimi, atomik stok düşme, email, wizard, başarı sayfası
Aşama 7 (Sipariş Yönetimi): 4/7 tamamlandı

Kalan: Admin durum güncelleme, kargo takip no, durum değişim email'i
Aşama 8 (Ek Özellikler): Profil sayfası tamamlandı, geri kalanlar bekliyor

Aşama 3 (Auth): PUT /profile ve PUT /change-password de işaretlendi

Sıradaki adım için ne yapmak istersiniz — Aşama 8 (değerlendirme/favori/kupon) veya Aşama 9 (Admin panel API bağlantısı)?