# ARGOS

Kişisel portföy yönetim botu — FastAPI backend, Telegram bildirimleri, teknik analiz ve Claude destekli raporlar.

**Repo:** [github.com/tunagirisken/argos](https://github.com/tunagirisken/argos)

## Özellikler

- Portföy CRUD (`portfolio.json`)
- Canlı fiyatlar (yfinance), teknik sinyaller (RSI, MACD, Bollinger, EMA)
- Haberler: Firecrawl → Exa yedek (yalnızca başlık + URL)
- Alarmlar: stop-loss, hedef, RSI, günlük hareket; Telegram
- Zamanlanmış görevler (TR saati): brifing, açılış, kapanış
- WebSocket `/ws/prices` (60 sn)

## Hızlı başlangıç

```bash
git clone git@github.com:tunagirisken/argos.git
cd argos
make install-all    # Python + npm bağımlılıkları
make start          # Backend + frontend birlikte (geliştirme)
```

| Komut | Ne yapar |
|--------|----------|
| `make start` | API **:8000** + UI **:5173** (Vite `/api` ve `/ws` proxy) |
| `make prod` | Tek port **:8000** — derlenmiş UI + API |
| `make test-all` | pytest + `frontend` production build |

- Geliştirme UI: http://localhost:5173
- Tek port (prod): http://localhost:8000
- API dokümantasyonu: http://localhost:8000/docs
- Sağlık: http://localhost:8000/health

## Proje yapısı

```
argos/
├── backend/          FastAPI uygulaması
├── frontend/         React + Vite + TypeScript (tasarım sistemi)
├── design/           HTML prototip (referans, build'e girmez)
├── ai/               AI bağlamı (token-verimli referans)
├── CLAUDE.md         Claude Code talimatları
├── AGENTS.md         Cursor agent talimatları
└── Makefile
```

İlk açılışta **Setup Wizard** (3 adım) görünür; tamamlanınca dashboard açılır. Frontend, backend ile aynı origin üzerinden `/api` ve `/ws` kullanır (geliştirmede Vite proxy, üretimde tek uvicorn süreci).

## Ortam değişkenleri

`backend/.env.example` dosyasındaki anahtarlar: Anthropic, Telegram, Firecrawl, Exa, Sentry.

## AI / geliştirme

Token tasarrufu için modüler bağlam: [`ai/README.md`](ai/README.md).

## Lisans

MIT — bkz. [LICENSE](LICENSE)
