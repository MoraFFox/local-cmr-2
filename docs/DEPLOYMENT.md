# Deployment

The app is a static single-page application. Build output goes to `dist/` and
can be hosted on any static host. The repo ships deploy configs for both
**Netlify** and **Vercel**.

## Build

```bash
npm run build   # → vite build → dist/
```

The build requires the environment variables at build time (they are inlined
by Vite):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `GEMINI_API_KEY` (optional)

## Netlify (`netlify.toml`)

- **Build command:** `npm run build`
- **Publish directory:** `dist`
- **SPA fallback:** redirects are defined for `/technician/*`,
  `/admin/invite`, `/admin/recovery/*`, `/technician/invite`,
  `/reset-password`, plus a catch-all `/*` → `/index.html` (all status 200).

Set the three environment variables in the Netlify site dashboard
(Site settings → Environment variables).

## Vercel (`vercel.json`)

- **Framework preset:** Vite/React (auto-detected; build `npm run build`,
  output `dist`)
- **Rewrite:** `/(.*)` → `/index.html` for SPA routing.

Set the same environment variables in the Vercel project settings.

## Supabase

The app talks to Supabase for auth, company/submission data, logistics, and
the machine catalog. Production requires:

- A Supabase project (the local `supabase/config.toml` references
  `project_id: onggzlzgfhroiqbyuimi` — confirm this is the production
  project or update `.env` with the correct URL/key).
- **Invite validation/redemption** (`/admin/invite`, `/technician/invite`)
  and **emergency admin recovery** (`/admin/recovery/*`) depend on Supabase
  **Edge Functions** (see `utils/inviteManager.ts` and
  `components/EmergencyAdminRecovery.tsx` for the expected function contract).
  Deploy those functions to the same Supabase project.
- Database tables for companies/branches/submissions/technicians/logistics
  must exist (the app is not schema-creating).

> <!-- VERIFY: confirm the production Supabase project, deployed Edge Functions,
> and their names/URLs. These are infrastructure claims not discoverable from
> this repository. -->

## PWA

`vite-plugin-pwa` (in `vite.config.ts`) generates a service worker at build
time (`registerType: 'autoUpdate'`) with runtime caching for Supabase API
calls and Google Fonts. The web manifest (`public/manifest.webmanifest`) is
RTL Arabic. No extra hosting configuration is required beyond serving the
`dist/` output over HTTPS.

## Post-deploy checks

1. Load the site and sign in as admin — auth must resolve against the
   production Supabase project.
2. Open `/technician` — the technician portal must render.
3. Generate one company report (PDF and Word) and confirm exports download.
4. Verify the PWA installs and works offline for previously-loaded records
   (the offline queue in `hooks/useOfflineQueue` + `utils/offlineQueue`
   persists pending mutations).
