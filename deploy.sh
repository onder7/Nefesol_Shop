#!/usr/bin/env bash
# deploy.sh — Ubuntu/Debian VPS'e ilk kurulum scripti
# Kullanım: sudo bash deploy.sh
set -euo pipefail

# ─── Renkli çıktı ─────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[HATA]${NC} $1"; exit 1; }

# ─── Değişkenler (BURALARARI DEĞİŞTİRİN) ──────────────────────────
DOMAIN="${DOMAIN:-example.com}"
EMAIL="${EMAIL:-admin@example.com}"
REPO_URL="${REPO_URL:-https://github.com/onder7/mabridgeglobal.git}"
APP_DIR="/opt/mabridgeglobal"

[[ "$DOMAIN" == "example.com" ]] && error "Lütfen DOMAIN değişkenini gerçek domain adınızla ayarlayın: DOMAIN=sizindomain.com bash deploy.sh"
[[ "$EMAIL" == "admin@example.com" ]] && error "Lütfen EMAIL değişkenini gerçek e-posta adresinizle ayarlayın: EMAIL=siz@domain.com bash deploy.sh"

info "Domain: $DOMAIN"
info "Email: $EMAIL"
info "Uygulama dizini: $APP_DIR"

# ─── 1. Sistem güncellemesi ────────────────────────────────────────
info "Sistem güncelleniyor..."
apt-get update -qq && apt-get upgrade -y -qq

# ─── 2. Docker kurulumu ────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  info "Docker kuruluyor..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
else
  info "Docker zaten kurulu: $(docker --version)"
fi

# Docker Compose (plugin) kontrolü
if ! docker compose version &>/dev/null; then
  info "Docker Compose plugin kuruluyor..."
  apt-get install -y docker-compose-plugin
fi

# ─── 3. Repo klonlama / güncelleme ────────────────────────────────
if [[ -d "$APP_DIR/.git" ]]; then
  info "Repo güncelleniyor..."
  git -C "$APP_DIR" pull
else
  info "Repo klonlanıyor..."
  git clone "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR"

# ─── 4. .env dosyası ──────────────────────────────────────────────
if [[ ! -f .env ]]; then
  info ".env dosyası oluşturuluyor..."
  cp .env.example .env

  # Güçlü secretlar üret
  JWT_SEC=$(openssl rand -hex 32)
  JWT_REF=$(openssl rand -hex 32)
  DB_PASS=$(openssl rand -hex 16)

  sed -i "s/GUCLU_SIFRE_DEGISTIR/$DB_PASS/g" .env
  sed -i "s/BURAYA_GUCLU_RASTGELE_SECRET_YAZIN/$JWT_SEC/" .env
  sed -i "s/BURAYA_BASKA_GUCLU_RASTGELE_SECRET/$JWT_REF/" .env
  sed -i "s|FRONTEND_URL=https://example.com|FRONTEND_URL=https://$DOMAIN|" .env
  sed -i "s|ADMIN_URL=https://example.com|ADMIN_URL=https://$DOMAIN|" .env
  sed -i "s/admin@example.com/admin@$DOMAIN/g" .env

  warn ".env dosyası oluşturuldu. Önemli: SMTP, Cloudinary ve İyzico bilgilerini manuel doldurun!"
  warn "Dosya: $APP_DIR/.env"
else
  info ".env dosyası zaten var, atlanıyor."
fi

# ─── 5. Nginx config — domain adını ayarla ────────────────────────
info "Nginx konfigürasyonu güncelleniyor..."
# HTTP-only config için (certbot'tan önce)
sed -i "s/example\.com/$DOMAIN/g" nginx/conf.d/default-http.conf
# HTTPS config için
sed -i "s/example\.com/$DOMAIN/g" nginx/conf.d/default.conf

# ─── 6. İlk çalıştırma: HTTP-only (certbot için) ──────────────────
info "SSL sertifikası alınmadan önce HTTP modunda başlatılıyor..."

# HTTPS config'i devre dışı bırak, sadece HTTP kullan
cp nginx/conf.d/default.conf nginx/conf.d/default.conf.ssl.bak
cp nginx/conf.d/default-http.conf nginx/conf.d/active.conf
# default.conf'u geçici olarak yeniden adlandır
mv nginx/conf.d/default.conf nginx/conf.d/default.conf.bak
mv nginx/conf.d/active.conf nginx/conf.d/default.conf

docker compose build --no-cache
docker compose up -d nginx frontend admin backend postgres redis

# ─── 7. Let's Encrypt sertifikası ─────────────────────────────────
info "Let's Encrypt sertifikası alınıyor..."
sleep 10  # nginx'in başlaması için bekle

docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  -d "$DOMAIN" \
  -d "www.$DOMAIN"

# ─── 8. SSL config'e geç ──────────────────────────────────────────
info "HTTPS konfigürasyonuna geçiliyor..."
mv nginx/conf.d/default.conf.bak nginx/conf.d/default.conf

docker compose restart nginx

# ─── 9. Certbot yenileme servisini başlat ─────────────────────────
docker compose up -d certbot

info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
info "Kurulum tamamlandı!"
info ""
info "  Mağaza:   https://$DOMAIN"
info "  Admin:    https://$DOMAIN/admin/"
info "  API:      https://$DOMAIN/api/"
info ""
warn "Yapılacaklar:"
warn "  1. .env dosyasında SMTP ayarlarını doldurun"
warn "  2. Ödeme entegrasyonu için İyzico bilgilerini ekleyin"
warn "  3. Admin şifresi için: docker compose exec backend node dist/scripts/reset-admin-password.js"
info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
