# ARGOS Frontend

React 18 + TypeScript + Vite.

## Geliştirme

```bash
cd frontend
npm install
npm run dev
```

http://localhost:5173 — API proxy `/api` → `localhost:8000`

## Tasarım

- `src/tokens.css` — `design/styles.css` :root birebir
- `src/global.css` — component ve layout stilleri
- `src/index.css` — Tailwind + shadcn (ARGOS token köprüsü)
- Referans: `../design/`

## shadcn/ui

```bash
npx shadcn@latest add table tabs dialog
```

Bileşenler: `src/components/ui/`. Yapılandırma: `components.json`.
