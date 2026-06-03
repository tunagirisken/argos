# ARGOS Backend

FastAPI uygulaması. Kökten çalıştırın:

```bash
cd ..   # repo kökü
make run
```

## Modüller

| Dizin | Rol |
|-------|-----|
| `api/routes/` | REST endpoint'leri |
| `api/websocket.py` | Canlı fiyat WS |
| `services/` | İş mantığı |
| `schedulers/jobs.py` | APScheduler |
| `data/` | portfolio, alerts JSON |
| `utils/` | market_hours, formatters, json_store |

AI referans: [`../ai/context/`](../ai/context/)

## Teknik not

Teknik indikatörler pandas/numpy ile hesaplanır (ortamda `pandas-ta` yoksa). Python 3.11+ ile `pandas-ta` tercih edilebilir.
