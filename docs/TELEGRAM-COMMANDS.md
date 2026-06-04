# Telegram bot komutları

ARGOS botu yalnızca `.env` içindeki `TELEGRAM_CHAT_ID` ile eşleşen sohbete yanıt verir.

## Genel

| Komut | Açıklama |
|-------|----------|
| `/start` | Hoş geldin mesajı ve komut özeti |
| `/help` | Komut listesi ( `/start` ile aynı ) |

## Portföy ve fiyat

| Komut | Açıklama | Örnek |
|-------|----------|-------|
| `/durum` | Portföy özeti: fiyat, günlük %, stop, hedef | `/durum` |
| `/fiyat` | Tek hisse anlık fiyat | `/fiyat NVDA` |
| `/sinyal` | Teknik sinyal (RSI, MACD, öneri) | `/sinyal MRVL` |
| `/trade` | Trade skoru AL/SAT/İZLE (teknik %70 + haber %30) | `/trade NVDA` veya `/trade` (portföy) |
| `/haber` | Son haber başlıkları (Firecrawl/Exa) | `/haber AVAV` |

## Hedef fiyat (analist konsensüsü)

| Komut | Açıklama | Örnek |
|-------|----------|-------|
| `/hedef` | Portföydeki tüm hisseler için analist hedef özeti | `/hedef` |
| `/hedef` | Tek sembol analist hedefi | `/hedef NVDA` |
| `/hedef_guncelle` | Web + Yahoo konsensüsü ile portföy `target` alanlarını günceller | `/hedef_guncelle` |
| `/hedef_ayar` | Manuel hedef (analist üzerine yazar) | `/hedef_ayar NVDA 220` |

Kaynaklar: Yahoo Finance / yfinance analist ortalaması; isteğe bağlı Firecrawl ile MarketWatch, TipRanks, Yahoo analist sayfaları. Güvenilirlik: analist sayısı ≥ 5 ve kaynaklar uyumlu → **yüksek**.

## Analiz ve alarmlar

| Komut | Açıklama | Örnek |
|-------|----------|-------|
| `/analiz` | Tam portföy AI analizi (LLM; birkaç dakika sürebilir) | `/analiz` |
| `/alarmlar` | Tanımlı özel alarmlar listesi | `/alarmlar` |
| `/stop` | Stop-loss güncelle | `/stop NVDA 175.5` |

## Otomatik bildirimler (komut değil)

- **09:00** — Sabah brifing (LLM)
- **16:30** — ABD piyasa açılışı (fiyat + sinyal)
- **23:05** — Kapanış raporu (LLM)
- **Her 5 dk** — Stop / hedef / RSI / büyük hareket alarmları
- **Her 5 dk** — Trade AL/SAT kararı değişince (otomatik; `/trade` ile manuel sorgu)

## Notlar

- Bot çalışması için `TELEGRAM_BOT_TOKEN` ve `TELEGRAM_CHAT_ID` ayarlı olmalıdır.
- `/analiz` ve `/hedef_guncelle` için LLM veya Firecrawl anahtarları gerekebilir.
- Komutlar büyük/küçük harf duyarsızdır; semboller otomatik büyük harfe çevrilir.
