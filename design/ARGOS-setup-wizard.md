# ARGOS — Setup Wizard · Implementation & Backend

> 3 adımlı onboarding sihirbazı. Prototip: `argos/ARGOS.html` (ilk açılışta gösterilir).
> Bu doküman Cursor implementation prompt'unu ve `localhost:8000` backend endpoint'lerini içerir.
> Tasarım tokenları için: `ARGOS-tasarim-sistemi.md`.

---

## 1. AKIŞ & KONTROL MANTIĞI

```
App mount
  └─ GET /api/setup/status
       ├─ setup_complete === true  → Dashboard
       └─ setup_complete === false → SetupWizard (dashboard engellenir)

Adım 1 (API Anahtarları)  → POST /api/setup/env       → Adım 2
Adım 2 (Portföy)          → POST /api/setup/portfolio  → Adım 3
Adım 3 (Hazır)            → POST /api/setup/complete    → Dashboard
```

- Setup bir kez tamamlanınca tekrar gösterilmez (`setup_complete` flag).
- Stop-loss / hedef fiyat **alınmaz** — sistem otomatik belirler.
- Prototipte tüm çağrılar `localStorage` ile mock'lanır (`setupApi`, `setup.jsx`).

---

## 2. KOMPONENT AĞACI

```
src/components/setup/
├── SetupWizard.jsx        // adım state'i, dir (slide yönü), busy, data
├── SetupProgress.jsx      // ●──○──○  (done: accent dolu, active: accent ring, future: muted)
├── Step1ApiKeys.jsx       // 6 SecretField (3 zorunlu + 3 opsiyonel)
│   └── SecretField        // label + req/opt badge + dış link + göz toggle + ✓/✗ format
├── Step2Portfolio.jsx
│   ├── CashInput          // "Mevcut USD Nakit"
│   ├── PositionForm       // Sembol(upper) | Adet(ondalık) | Ort.Alış($) | +Ekle
│   ├── PositionList       // 🔵 SEMBOL · X hisse @ $cost · [Düzenle][Sil] · boş-durum
│   └── PendingOrderForm   // collapsible: Sembol | AL/SAT | Fiyat | Adet
└── Step3Complete.jsx      // özet kartı (✓ hisse / API / Telegram / Alarm) + accent pulse
```

### Doğrulama (format)
| Alan | Kural | Zorunlu |
|---|---|---|
| Anthropic API Key | `sk-ant-…` | ✓ |
| Telegram Bot Token | `\d{6,}:[\w-]{20,}` | ✓ |
| Telegram Chat ID | `-?\d{5,}` | ✓ |
| Firecrawl API Key | `fc-…` | – |
| Exa API Key | uzunluk ≥ 8 | – |
| Sentry DSN | `https?://…` | – |

"İleri" yalnızca **3 zorunlu** alan geçerliyse aktif. "Kaydet ve Devam" en az **1 hisse** eklenince aktif.

---

## 3. BACKEND ENDPOINTLERİ (FastAPI · localhost:8000)

```python
# api/setup.py
from fastapi import APIRouter
from pydantic import BaseModel
from pathlib import Path
import json, os

router = APIRouter(prefix="/api/setup", tags=["setup"])
ENV_PATH = Path(".env")
PORTFOLIO_PATH = Path("portfolio.json")
FLAG_PATH = Path(".setup_complete")

class EnvBody(BaseModel):
    anthropic_api_key: str
    telegram_bot_token: str
    telegram_chat_id: str
    firecrawl_api_key: str | None = None
    exa_api_key: str | None = None
    sentry_dsn: str | None = None

class Position(BaseModel):
    symbol: str
    shares: float
    avg_cost: float

class PendingOrder(BaseModel):
    symbol: str; side: str; price: float; shares: float

class PortfolioBody(BaseModel):
    cash_usd: float = 0
    positions: list[Position]
    pending_orders: list[PendingOrder] = []

@router.get("/status")
def status():
    return {
        "setup_complete": FLAG_PATH.exists(),
        "has_env": ENV_PATH.exists(),
        "has_portfolio": PORTFOLIO_PATH.exists(),
    }

@router.post("/env")
def post_env(body: EnvBody):
    lines = {
        "ANTHROPIC_API_KEY": body.anthropic_api_key,
        "TELEGRAM_BOT_TOKEN": body.telegram_bot_token,
        "TELEGRAM_CHAT_ID": body.telegram_chat_id,
        "FIRECRAWL_API_KEY": body.firecrawl_api_key or "",
        "EXA_API_KEY": body.exa_api_key or "",
        "SENTRY_DSN": body.sentry_dsn or "",
    }
    ENV_PATH.write_text("\n".join(f"{k}={v}" for k, v in lines.items() if v))
    return {"ok": True}

@router.post("/portfolio")
def post_portfolio(body: PortfolioBody):
    # Stop-loss / hedef YOK — sistem otomatik hesaplar
    PORTFOLIO_PATH.write_text(body.model_dump_json(indent=2))
    return {"ok": True}

@router.post("/complete")
def complete():
    FLAG_PATH.write_text("1")
    return {"ok": True}
```

> `.env` ve `.setup_complete` mutlaka `.gitignore`'a eklenmeli.

---

## 4. CURSOR IMPLEMENTATION PROMPTU

```
ARGOS uygulamasına 3 adımlı bir SetupWizard onboarding'i ekle. Mevcut tasarım
sistemini (ARGOS-tasarim-sistemi.md token'ları) BİREBİR kullan. shadcn/ui
komponentleri + framer-motion. Tüm fiyat/anahtar metinleri JetBrains Mono.

KONTROL: App.jsx mount'ta GET /api/setup/status çağır. setup_complete=false ise
SetupWizard göster ve dashboard'ı engelle; true ise dashboard. Tamamlanınca
yönlendir. Setup bir kez bitince tekrar gösterilmez.

ADIMLAR:
1) API Anahtarları — 6 SecretField. Zorunlu: Anthropic (sk-ant-), Telegram Bot
   Token (\d+:...), Telegram Chat ID (-?\d+). Opsiyonel: Firecrawl (fc-), Exa,
   Sentry DSN (url). Her alan: göz göster/gizle + dış link ikonu + canlı format
   doğrulama (geçerli yeşil ✓ / geçersiz kırmızı ✗). "İleri" yalnız 3 zorunlu
   geçerliyse aktif → POST /api/setup/env.
2) Portföy — USD nakit input + hisse ekleme formu (Sembol otomatik büyük harf,
   Adet ondalık, Ort. Alış $ prefix) + eklenen hisse listesi (düzenle/sil, boş
   durum mesajı) + collapsible bekleyen emirler (Sembol|AL/SAT|Fiyat|Adet).
   STOP-LOSS VE HEDEF ALMA — sistem otomatik belirler. "Kaydet ve Devam" en az
   1 hisse ile aktif → POST /api/setup/portfolio.
3) Hazır — özet kartı (✓ X hisse, ✓ API, ✓ Telegram, ✓ Alarm) + accent pulse.
   "Dashboard'a Git" → POST /api/setup/complete → dashboard.

PROGRESS: üstte ●──○──○. done=accent dolu, active=accent ring, future=muted.
Geri butonu 1. adımda yok, 2-3'te var.

ANİMASYON (framer-motion): wizard açılış fade+scale .95→1, adım geçişi slide
left/right, hisse ekleme fade+slide-down, silme fade+slide-up, adım 3 accent pulse.

BACKEND: bu dokümanın 3. bölümündeki /api/setup/{status,env,portfolio,complete}
endpoint'lerini FastAPI'ye ekle. .env + portfolio.json + .setup_complete yaz.

KALİTE: mobile responsive, erişilebilir (klavye, aria), anahtarlar asla loglanmaz.
```

---

*Prototip referansı: `argos/ARGOS.html` — Settings → "Kurulum sihirbazı · Yeniden çalıştır" ile tekrar tetiklenebilir.*
