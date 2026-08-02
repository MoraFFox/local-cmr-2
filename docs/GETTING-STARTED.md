# Getting Started

This guide gets you from a fresh checkout to a running local dev server.

## Prerequisites

- **Node.js** 18+ (the app builds with Vite 6)
- **Bun** (recommended — this repo uses `bun.lock`; npm works too)
- A **Supabase** project (URL + anon key) — required at startup because
  `supabaseClient.ts` throws if the env vars are missing

## 1. Install dependencies

```bash
bun install
# or: npm install
```

## 2. Configure environment

```bash
cp .env.example .env
```

Then edit `.env`:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
GEMINI_API_KEY=your-gemini-api-key   # optional, for AI problem suggestions
```

Both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are required.

## 3. Run the dev server

```bash
bun run dev
# or: npm run dev
```

Vite serves the app at **http://localhost:3000** (port 3000, host 0.0.0.0).

> The app is Arabic-first RTL (`index.html` is `lang="ar" dir="rtl"`), with an
> English toggle in the UI via `utils/LanguageContext`.

### Skipping auth in development (optional)

The app gates `/` behind admin login. For local work you can bypass admin auth
in dev mode by setting `localStorage`:

```js
localStorage.setItem("dev-bypass-auth", "1");
// then reload — AppRouter.tsx checks this only when import.meta.env.DEV is true
```

## 4. What you can do next

- **Fill a company form:** side bar → "New Company" (`/companies/new`) opens
  the 6-step wizard (company info, branches, warehouse, baristas, maintenance
  history, review).
- **Technician flow:** `/technician` is the technician portal (context →
  work log → summary) with photo capture and offline queuing.
- **Reports:** company/branch/visit reports export as **PDF** and **Word**;
  see `PDF_EXPORT_GUIDE.md` for the report details.

## 5. Build & preview

```bash
bun run build      # production build → dist/
bun run preview    # serve the built app locally
```

## 6. Tests

```bash
bun run test        # unit/component tests (Vitest + jsdom)
bun run test:e2e    # Playwright E2E (Chromium, dev server on :3000)
```

See `docs/TESTING.md` for details.
