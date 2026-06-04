# ARGOS

Kişisel portföy yönetim asistanı — FastAPI backend, React dashboard, Telegram bildirimleri, gerçek piyasa verisi (yfinance) ve LLM destekli analiz.

**Repo:** [github.com/tunagirisken/argos](https://github.com/tunagirisken/argos)

## Özellikler

- **Auth:** JWT login/register, setup wizard
- **Portföy:** CRUD, canlı P/L, pozisyon ekleme/silme
- **Piyasa:** yfinance fiyat + OHLCV grafikler (lightweight-charts)
- **Teknik:** RSI, MACD, Bollinger, EMA → AL/SAT/BEKLE sinyalleri
- **Trade asistanı:** Teknik + haber skoru → AL/SAT/İZLE
- **Keşif motoru:** 4 katmanlı tarama + LLM tez (`/discovery`)
- **Analist hedefleri:** yfinance konsensüs + Firecrawl doğrulama
- **Haberler:** Firecrawl → Exa yedek
- **Alarmlar:** stop-loss, hedef, RSI, büyük hareket → Telegram
- **AI:** Sohbet, portföy analizi (Gemini/Claude)
- **Canlı sync:** WebSocket market snapshots (60 sn) + REST fallback
- **Zamanlanmış:** Sabah brifingi, açılış, kapanış (TR saati)

## Hızlı başlangıç

```bash
git clone git@github.com:tunagirisken/argos.git
cd argos
make install-all
make start
```

| Komut | Ne yapar |
|--------|----------|
| `make start` | API **:8000** + UI **:5173** |
| `make prod` | Tek port **:8000** — derlenmiş UI + API |
| `make test-all` | pytest + frontend build |
| `make test` | Backend pytest only |
| `make test-smoke` | Playwright dashboard smoke (`SMOKE_PASS` gerekli) |

- Geliştirme UI: http://localhost:5173
- Prod: http://localhost:8000
- API docs: http://localhost:8000/docs
- Health: http://localhost:8000/health

İlk açılışta **Setup Wizard** (3 adım) görünür. Ortam: `backend/.env.example`.

## Proje yapısı

```
argos/
├── backend/          FastAPI, services, schedulers, data/
├── frontend/         React + Vite + TypeScript
├── design/           UI prototypes (referans, build'e girmez)
├── ai/               AI bağlamı ve promptlar
├── docs/             Operasyon ve audit dokümanları
├── scripts/          start, test, integrations
└── Makefile
```

## Güvenlik notu

Tüm `/api/*` endpoint'leri (auth login/register hariç) **JWT Bearer token** gerektirir. Üretimde `ARGOS_JWT_SECRET` zorunludur (`ENV=production`). WebSocket `/ws/prices` yerel geliştirmede açıktır. Ayrıntı: [docs/STABILIZATION-AUDIT.md](docs/STABILIZATION-AUDIT.md).

## Dokümantasyon

| Doc | İçerik |
|-----|--------|
| [docs/STABILIZATION-AUDIT.md](docs/STABILIZATION-AUDIT.md) | Mimari audit, tech debt, roadmap |
| [docs/TESTING.md](docs/TESTING.md) | Test ve QA checklist |
| [ai/README.md](ai/README.md) | AI geliştirme bağlamı |
| [docs/TELEGRAM-COMMANDS.md](docs/TELEGRAM-COMMANDS.md) | Bot komutları |

## Cursor eklentileri

```bash
./scripts/setup-plugins.sh
./scripts/check-integrations.sh
```

Ayrıntı: [docs/CURSOR-PLUGINS.md](docs/CURSOR-PLUGINS.md)

## Lisans

MIT — [LICENSE](LICENSE)
