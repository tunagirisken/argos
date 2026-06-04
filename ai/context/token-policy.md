# Token politikası (uygulama + AI geliştirme)

## LLM API (runtime)

- Sağlayıcı: `LLM_PROVIDER` — `anthropic` | `gemini` (`backend/services/llm_service.py`)
- Anthropic model: `claude-sonnet-4-20250514`
- Gemini model: `gemini-2.5-flash`
- **Çağır:** sabah brifing, kapanış, manuel analysis, ACİL stop-loss, trade AL/SAT bildirimi
- **Çağırma:** fiyat poll, teknik hesap, klasik alarm (ACİL hariç), 16:30 açılış, trade skor hesabı
- `max_tokens`: rapor Anthropic 400 / Gemini min 8192 (`GEMINI_MIN_REPORT_TOKENS`, 2.5 thinking payı), portföy 1200/hisse istek → 8192 tavan, chat 600, acil ~150, **trade alert 200**, **keşif thesis 250/hisse (max 5)**
- Keşif katman 1–3: LLM yok; katman 4 yalnız top 5; haber yalnız başlık
- Trade prompt: `ai/prompts/trade-alert-system.md`, `ai/prompts/trade-alert-user.md`
- System: `COMPACT_SYSTEM` + `formatters.compact_*` — haber sadece başlık

## Geliştirme oturumu (Cursor/Claude Code)

- Önce `AGENTS.md` veya `CLAUDE.md`, sonra **tek** `ai/context/*.md`
- Plan dosyalarını okuma/düzenleme (kullanıcı istemedikçe)
- `backend/data/*.json` içeriğini context'e yapıştırma (sembol listesi yeter)
- Uzun diff yerine hedef dosya + fonksiyon adı belirt

## Haber

Firecrawl birincil, Exa yedek. Response: `{title, url, published_at}` only.

## Env

`LLM_PROVIDER`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `TELEGRAM_*`, `FIRECRAWL_API_KEY`, `EXA_API_KEY`, `SENTRY_DSN` — `backend/.env.example`
