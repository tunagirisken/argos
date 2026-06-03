# Stack ve ortam

| Bileşen | Not |
|---------|-----|
| Python | ≥3.10 (3.11+ önerilir) |
| FastAPI + uvicorn | `backend/main.py` |
| yfinance | Fiyat, 3× retry |
| pandas + numpy | Teknik (pandas-ta PyPI yoksa) |
| anthropic | Claude servisi |
| aiohttp | Telegram, Firecrawl, Exa |
| APScheduler | `Europe/Istanbul` |
| sentry-sdk | FastAPI integration |

Kurulum: `make install` veya `pip install -r backend/requirements.txt`

Çalıştır: `uvicorn backend.main:app` (cwd = repo kökü)

Python path: paket `backend` — import `from backend.services...`
