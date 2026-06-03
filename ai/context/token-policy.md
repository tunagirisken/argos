# Token politikası (uygulama + AI geliştirme)

## Claude API (runtime)

- Model: `claude-sonnet-4-20250514`
- **Çağır:** sabah brifing, kapanış, manuel analysis, ACİL stop-loss
- **Çağırma:** fiyat poll, teknik hesap, alarm (ACİL hariç), 16:30 açılış
- `max_tokens`: rapor 400, chat 600, acil ~150
- System: `COMPACT_SYSTEM` + `formatters.compact_*` — haber sadece başlık

## Geliştirme oturumu (Cursor/Claude Code)

- Önce `AGENTS.md` veya `CLAUDE.md`, sonra **tek** `ai/context/*.md`
- Plan dosyalarını okuma/düzenleme (kullanıcı istemedikçe)
- `backend/data/*.json` içeriğini context'e yapıştırma (sembol listesi yeter)
- Uzun diff yerine hedef dosya + fonksiyon adı belirt

## Haber

Firecrawl birincil, Exa yedek. Response: `{title, url, published_at}` only.

## Env

`ANTHROPIC_API_KEY`, `TELEGRAM_*`, `FIRECRAWL_API_KEY`, `EXA_API_KEY`, `SENTRY_DSN` — `backend/.env.example`
