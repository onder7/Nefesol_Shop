# 🚀 Canlı Sunucuya Deploy (GitHub Actions)

`master`'a her push'ta `.github/workflows/deploy.yml` çalışır: sunucuya SSH ile bağlanır,
en güncel kodu çeker, `.env`'i GitHub secret'larından yazar, `docker compose up -d --build` yapar.

> SMTP / Brevo / İyzico / Google Client ID gibi ayarlar **admin panelinden (DB)** yönetilir;
> bunlar `.env`'de tutulmaz. `.env` yalnızca altyapı sırlarını içerir.

---

## 1) Gerekli GitHub Secrets

`Settings → Secrets and variables → Actions → New repository secret`

| Secret | Açıklama | Örnek |
|--------|----------|-------|
| `SERVER_HOST` | Sunucu IP | `31.7.33.14` |
| `SERVER_USER` | SSH kullanıcısı | `onder` |
| `SERVER_PASSWORD` | SSH şifresi *(SSH key önerilir — aşağıya bkz.)* | `••••••` |
| `POSTGRES_USER` | DB kullanıcı | `ecom` |
| `POSTGRES_PASSWORD` | DB şifre (güçlü) | `openssl rand -hex 16` |
| `POSTGRES_DB` | DB adı | `ecommerce` |
| `JWT_SECRET` | En az 32 karakter | `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | En az 32 karakter | `openssl rand -hex 32` |
| `FRONTEND_URL` | Sitenin adresi | `http://31.7.33.14` veya `https://alanadiniz.com` |

> ✅ Zaten ekli: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
> ➕ Eklenecek: `SERVER_HOST`, `SERVER_USER`, `SERVER_PASSWORD`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `FRONTEND_URL`

---

## 2) Sunucu hazırlığı (tek seferlik, manuel SSH)

`onder` kullanıcısıyla sunucuya girip:

```bash
# Docker + Compose + git
curl -fsSL https://get.docker.com | sudo sh
sudo apt-get install -y docker-compose-plugin git

# 'onder' kullanıcısını docker grubuna ekle (sudo'suz docker için)
sudo usermod -aG docker onder
# Çıkış yapıp tekrar girin (grup üyeliği aktif olsun)
```

---

## 3) İlk deploy

1. Yukarıdaki tüm secret'ları ekleyin.
2. GitHub → **Actions → Deploy to Production → Run workflow** (veya master'a bir push).
3. Workflow biter: kod çekilir, `.env` yazılır, container'lar build edilip başlar.

### İlk admin kullanıcısı
```bash
cd ~/nefesol-shop
docker compose exec backend node create-admin.js
# admin@ecommerce.com / Admin123!  → giriş yapıp şifreyi değiştirin
```

Adres: `http://SUNUCU_IP` · Admin: `http://SUNUCU_IP/admin`

---

## ⚠️ Önemli notlar

- **DB şifresi ilk kurulumda sabitlenir.** PostgreSQL `POSTGRES_PASSWORD`'ü **yalnızca veritabanı
  ilk oluşturulurken** kullanır. Daha sonra secret'taki şifreyi değiştirirseniz `DATABASE_URL`
  eşleşmez ve bağlantı kopar. Şifreyi değiştirmeniz gerekirse DB volume'ünü sıfırlamanız gerekir
  (veri kaybı). Bu yüzden ilk deploy'dan önce güçlü bir `POSTGRES_PASSWORD` belirleyin.
- **SSH key (önerilir):** Şifre yerine anahtar kullanmak daha güvenli. Sunucuda
  `~/.ssh/authorized_keys`'e public key ekleyin, private key'i `SERVER_SSH_KEY` secret'ı yapın,
  `deploy.yml`'de `password:` satırını `key: ${{ secrets.SERVER_SSH_KEY }}` ile değiştirin.
- **HTTPS:** IP ile HTTP çalışır. Alan adı + SSL için `bash deploy.sh` scriptini
  `ENABLE_SSL=true` ile bir kez çalıştırın (Let's Encrypt).
