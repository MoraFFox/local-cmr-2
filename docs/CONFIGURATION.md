# Configuration

This page documents every configuration surface of the project. The app is a
Vite + React SPA (TypeScript) with a Supabase backend. Runtime configuration
comes from environment variables (`.env`), the Vite build config
(`vite.config.ts`), the Tailwind theme (`tailwind.config.js`), and deploy
configs (`netlify.toml`, `vercel.json`).

## Environment variables

Copy `.env.example` to `.env` (or `.env.local`) and fill in real values:

| Variable | Required | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | Supabase project URL. Used by `supabaseClient.ts`, `utils/googleSheetsSync.ts`, and several components. |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase anon/public key. |
| `GEMINI_API_KEY` | optional | Gemini API key for AI-powered problem suggestions. Injected at build time via `define` in `vite.config.ts` as `process.env.API_KEY` / `process.env.GEMINI_API_KEY` (used by `utils/problemSuggestions.ts` and the `@google/genai` dependency). |

`supabaseClient.ts` throws at import time if `VITE_SUPABASE_URL` or
`VITE_SUPABASE_ANON_KEY` is missing.

## Vite (`vite.config.ts`)

- **Dev server:** port `3000`, host `0.0.0.0` (`bun run dev` / `npm run dev`).
- **Plugins:** `@vitejs/plugin-react`, `vite-plugin-pwa` (PWA + service worker,
  manifest in `public/manifest.webmanifest`, runtime caching for Supabase and
  Google Fonts), and a custom `spa-fallback` middleware that serves
  `index.html` for client-side routes (`/technician*`, `/admin/invite`,
  `/admin/recovery/*`, `/reset-password`, `/records`).
- **Define:** `process.env.API_KEY` and `process.env.GEMINI_API_KEY` are
  replaced with the `GEMINI_API_KEY` env value at build time.
- **Aliases:** `@` → project root; `bidi-js` → `bidi-js/dist/bidi.js` (CJS
  workaround for a broken upstream ESM build — do not retry upgrading bidi-js).
- **Build:** manual chunks for `react-vendor`, `pdf` (jspdf etc.), `supabase`,
  and `icons`; `chunkSizeWarningLimit: 650`.
- **Vitest config:** jsdom environment, `setupFiles: ['./vitest.setup.ts']`,
  `globals: true`, includes `tests/**/*.test.{ts,tsx}` and excludes
  `e2e/**` + `tests/**/*.spec.ts`.

## Tailwind (`tailwind.config.js`)

- Content globs cover `index.html`, `index.tsx`, `App.tsx`, `components/**`,
  `utils/**`, `src/**`.
- `darkMode: 'class'` — dark mode toggled by a `.dark` class on `<html>`
  (applied pre-paint by an inline script in `index.html`).
- Fonts: `Tajawal` / `Cairo` for `sans` + `display`, `IBM Plex Mono` for
  `mono` (loaded via `@fontsource` imports in `index.css`).
- Palette: `primary #B61E24` (brand red), `hover #8F171C`, `accent #D4A017`,
  plus semantic tokens (`bg-body`, `text-primary`, …) backed by CSS variables
  for dark-mode swapping, and legacy aliases (`paper`, `cream`, `espresso`,
  `ink`, `latte`, `hairline`, `copper`, `leaf`, `ember`, …).

## Supabase (`supabase/config.toml`)

Local Supabase CLI config (used with `supabase start` for local backend dev):

- `project_id`: onggzlzgfhroiqbyuimi
- API on port `54321`, Postgres on `54322`, Studio on `54323`, DB major
  version 15, `max_rows: 1000`.

> <!-- VERIFY: confirm the local Supabase stack is running and that the remote
> Supabase project (project_id above) is the intended production backend -->

## Deploy configs

- **Netlify (`netlify.toml`):** build `npm run build`, publish `dist`, SPA
  redirects for `/technician/*`, `/admin/invite`, `/admin/recovery/*`,
  `/technician/invite`, `/reset-password`, and a catch-all `/*` → `/index.html`.
- **Vercel (`vercel.json`):** single rewrite `/(.*)` → `/index.html`.

> <!-- VERIFY: confirm the live hosting provider (Netlify vs Vercel) for the
> production deployment, and that env vars are set in the hosting dashboard -->

## Package scripts (`package.json`)

| Script | Command |
|---|---|
| `dev` | `vite` (port 3000) |
| `build` | `vite build` |
| `preview` | `vite preview` |
| `test` | `vitest run` |
| `test:watch` | `vitest` |
| `test:e2e` | `playwright test` |
| `test:e2e:ui` | `playwright test --ui` |
| `i18n:allowlist` | `npx tsx scripts/generateAllowlist.ts` |
| `i18n:check` | `npx tsx scripts/checkI18n.ts` |
| `prepare` | `npx simple-git-hooks` (installs the pre-commit i18n hook) |

Package manager: `bun` is used in this repo (`bun.lock` present) but npm
scripts also work; the deploy configs invoke `npm run build`.
