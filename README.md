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
make install
cp backend/.env.example backend/.env   # anahtarları doldurun
make run
```

- API dokümantasyonu: http://localhost:8000/docs
- Sağlık: http://localhost:8000/health

## Proje yapısı

```
argos/
├── backend/          FastAPI uygulaması
├── ai/               AI bağlamı (token-verimli referans)
├── CLAUDE.md         Claude Code talimatları
├── AGENTS.md         Cursor agent talimatları
└── Makefile
```

## Ortam değişkenleri

`backend/.env.example` dosyasındaki anahtarlar: Anthropic, Telegram, Firecrawl, Exa, Sentry.

## AI / geliştirme

Token tasarrufu için modüler bağlam: [`ai/README.md`](ai/README.md).

## Lisans

MIT — bkz. [LICENSE](LICENSE)
