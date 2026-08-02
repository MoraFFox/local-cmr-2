# Development

Guidelines and conventions for working in this codebase.

## Project structure

```
├── App.tsx                      # Admin shell: sidebar, lazy views, chrome
├── components/                  # Feature & shared components
│   ├── form-ui/                 #   form primitives (EnhancedInput, Selector…)
│   ├── technician-portal/       #   technician flow screens
│   └── ...
├── src/views/                   # Route-level views (lazy-loaded)
│   └── wizard/                  #   multi-step company form steps
├── hooks/                       # Custom hooks (barrel-exported from index.ts)
├── utils/                       # Domain logic, i18n, PDF/Word export
├── constants.ts                 # NAV_ITEMS, ViewKey
├── types.ts                     # Shared domain types
├── tests/                       # Vitest unit/component tests
├── e2e/                         # Playwright E2E specs
└── scripts/                     # i18n tooling (checkI18n, generateAllowlist)
```

## Key conventions

- **Views are lazy-loaded.** Add route-level views under `src/views/` and
  `React.lazy`-import them in `App.tsx` for code splitting (manual chunks in
  `vite.config.ts` keep vendors separate).
- **Navigation lives in `constants.ts`** (`NAV_ITEMS`, `ViewKey`,
  `pathToView`). Add new sidebar items there, not inline in components.
- **Domain types live in `types.ts`.** `FormData` is the canonical company
  form shape; `MaintenanceRecord`, `LogisticsOperation`, `Contact`, etc. model
  the domain. Keep form-wizard UI types close to the steps that use them.
- **Arabic-first.** UI copy is authored in Arabic, with English translations
  in `utils/englishTranslations.ts` / `utils/arabicTranslations.ts`. Access
  via `useLanguage()` from `utils/LanguageContext`. The i18n audit
  (`npm run i18n:check`) runs on every commit (pre-commit hook) and fails on
  untracked English strings — regenerate the allowlist with
  `npm run i18n:allowlist` when adding intentionally-exempt strings.
- **RTL & Arabic shaping.** Layout is RTL by default; be careful with
  `left`/`right` (use logical properties where possible). Arabic text in PDFs
  goes through `utils/arabicText.ts` (bidi reshaping) — do not bypass it.
- **Offline awareness.** Use `useNetworkStatus`, and route writes through
  `useOfflineQueue` / `utils/offlineQueue` where a mutation must survive a
  network drop.

## Adding a report export

Reports come in three flavors:

1. **jsPDF** — new-style reports use `utils/internalReportPdf.ts` +
   `utils/pdfCompactLayout.ts` (`PDFLayoutEngine`). The layout engine
   auto-suppresses empty fields/rows/sections; pass `hideEmptyComponents:
   false` if a caller needs the old draft placeholders.
2. **Word (.docx)** — `utils/wordExport.ts` (+ labels/template). The `docx`
   library is lazy-loaded; content flows continuously (no forced page breaks).
3. **Print HTML** — `components/InternalReportPrintView.tsx` /
   `components/PrintableWorkOrder.tsx` for browser print.

When adding fields to a report, update **all** surfaces consistently (PDF,
Word, print) and add/extend the regression tests in `tests/`
(`internalReportPdf.test.ts`, `wordExport.test.ts`, `printViewEmpty.test.tsx`,
`pdfGeneratorEmpty.test.ts`).

## Styling

- Tailwind 3 with a custom palette (`tailwind.config.js`): `primary #B61E24`,
  semantic tokens (`bg-body`, `text-primary`, …) mapped to CSS variables, and
  legacy aliases. **Prefer semantic tokens** over legacy names in new code.
- Dark mode is class-based (`.dark` on `<html>`, applied pre-paint in
  `index.html`); use `dark:` variants and test both modes.
- Fonts: Tajawal/Cairo (sans), IBM Plex Mono (mono) — imported via
  `@fontsource` in `index.css`.

## Validation before committing

```bash
bun run test          # Vitest unit/component tests (jsdom)
bun run test:e2e      # Playwright E2E
npx tsc --noEmit      # typecheck
npm run i18n:check    # i18n audit (also enforced by the pre-commit hook)
```

> Note: `bun test` (Bun's native runner) lacks jsdom — use the project's
> configured runner (`npm test` → `vitest run`) for the test suites.
