# Admin kurulumu (API anahtarları otomatik)

API anahtarlarını **wizard’da veya sohbette girmeyin**. Sunucuda yerel dosyada tutulur.

## 1. Bootstrap dosyası (senin makinen)

```bash
cd argos
cp backend/.env.bootstrap.example backend/.env.bootstrap
nano backend/.env.bootstrap   # anahtarları buraya yaz
```

Doldurulacak alanlar:

| Alan | Nereden alınır |
|------|----------------|
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey |
| `TELEGRAM_BOT_TOKEN` | @BotFather → /newbot |
| `TELEGRAM_CHAT_ID` | @userinfobot veya bota /start sonrası getids |
| `FIRECRAWL_API_KEY` | https://firecrawl.dev (opsiyonel) |
| `EXA_API_KEY` | https://exa.ai (opsiyonel) |

Bu dosya **git’e girmez** (`.gitignore`).

## 2. Admin şifresi (sunucu)

`backend/.env` veya ortam değişkeni:

```bash
export ARGOS_ADMIN_USER=admin
export ARGOS_ADMIN_PASSWORD=guclu_bir_sifre
export ARGOS_JWT_SECRET=$(openssl rand -hex 32)
```

## 3. Giriş

1. http://localhost:5173 → **Giriş**
2. Kullanıcı: `admin` (veya `ARGOS_ADMIN_USER`)
3. Şifre: yukarıdaki `ARGOS_ADMIN_PASSWORD`

Admin girişinde `backend/.env.bootstrap` → `backend/.env` kopyalanır.

## 4. Normal üye

- **Kayıt ol** ile hesap aç
- API anahtarları **Ayarlar → API ve entegrasyonlar** (rehber linkleri ile)

## Güvenlik

- Anahtarları asla repoya commit etmeyin
- Sohbette paylaşılan anahtarları **yenileyin** (rotate)
