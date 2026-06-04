# Hedef fiyat kaynakları

ARGOS, portföydeki **hedef** alanını mümkün olduğunca güncel ve güvenilir analist konsensüsüne göre doldurur.

## Veri kaynakları (öncelik sırası)

1. **Yahoo Finance / yfinance** — `targetMeanPrice`, `targetHighPrice`, `targetLowPrice`, `numberOfAnalystOpinions`, `recommendationKey`. Yapılandırılmış veri; birincil kaynak.
2. **Firecrawl web taraması** (opsiyonel) — MarketWatch, Yahoo Finance analist, TipRanks vb. sayfalarda "average price target", "consensus" ifadeleri aranır; sayısal değerler çıkarılır ve yfinance ile karşılaştırılır.

## Güvenilirlik skoru

| Skor | Koşul |
|------|--------|
| **yüksek** | ≥ 5 analist görüşü ve web ortalaması yfinance ortalamasına ±%8 içinde |
| **orta** | ≥ 3 analist veya yalnızca yfinance ortalaması mevcut |
| **düşük** | Yalnızca web taraması veya tek kaynak; manuel doğrulama önerilir |

## Güncelleme yolları

- **Telegram:** `/hedef_guncelle`
- **API:** `POST /api/portfolio/sync-targets`
- **Web:** Dokümantasyon → Hedef fiyatlar veya hisse detayında "Analist hedefini çek"
- **Kurulum:** Yeni pozisyon eklenirken otomatik hedef çekimi (yfinance; başarısızsa maliyet × 1.15)

## Manuel override

Hisse detayında veya `/hedef_ayar SEMBOL FIYAT` ile analist değerinin üzerine yazabilirsiniz.
