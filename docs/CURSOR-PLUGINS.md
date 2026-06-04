# ARGOS — Cursor eklenti entegrasyonu

## Özet

| Eklenti | Runtime (ARGOS) | Cursor (geliştirme) |
|---------|-----------------|---------------------|
| **Firecrawl** | `FIRECRAWL_API_KEY` → `news_service.py` | CLI + MCP skill |
| **Exa** | `EXA_API_KEY` → haber yedek | API key (MCP yoksa `.env` yeterli) |
| **shadcn/ui** | `frontend/components.json` | `npx shadcn@latest add …` |
| **Figma** | `design/` referans | Figma MCP + `figma-use` skill |

## 1. Kurulum kontrolü

```bash
./scripts/check-integrations.sh
```

## 2. Firecrawl

**Backend (haber):** Setup wizard → Haber API veya `backend/.env`:

```
FIRECRAWL_API_KEY=fc-...
```

**Cursor agent:**

```bash
npm install -g firecrawl-cli
firecrawl login --browser
firecrawl --version --auth-status
```

Test: `curl http://localhost:8000/api/news/NVDA`

## 3. Exa

```
EXA_API_KEY=...
```

Firecrawl yoksa veya boş dönerse `news_service` Exa’ya düşer.

## 4. shadcn/ui

Proje hazır: `frontend/components.json`, `@/components/ui/*`.

```bash
cd frontend
npx shadcn@latest add table tabs dialog
```

Tema ARGOS `tokens.css` ile bağlı (`src/index.css`).

## 5. Figma

1. Cursor → Settings → Plugins → **Figma** → Enable + Authenticate  
2. UI görevlerinde `design/` + `figma-use` skill kullan  
3. Agent talimatı: `.cursor/rules/cursor-plugins.mdc`

## 6. API durumu

```bash
curl http://localhost:8000/api/setup/integrations
```

UI: **Ayarlar** → Entegrasyonlar kartı.
