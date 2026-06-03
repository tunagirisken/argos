# ARGOS AI bağlamı

Token tasarrufu için **modüler, kısa** referans dosyaları. Tümünü birden okuma.

## Ne zaman hangi dosya?

| Görev | Dosya |
|-------|--------|
| İlk bakış / yeni özellik | `context/overview.md` |
| Endpoint ekle/değiştir | `context/api-endpoints.md` |
| Servis / scheduler / alarm | `context/architecture.md` |
| Claude / haber / Telegram | `context/token-policy.md` |
| Bağımlılık / sürüm | `context/stack.md` |
| Standart görev metni | `prompts/*.md` |

## Kök talimatlar

- Anthropic Claude Code: [`../CLAUDE.md`](../CLAUDE.md)
- Cursor agents: [`../AGENTS.md`](../AGENTS.md)

## Güncelleme

Kod değişince ilgili `context/*.md` dosyasını aynı PR'da güncelle (1–2 cümle yeter).
