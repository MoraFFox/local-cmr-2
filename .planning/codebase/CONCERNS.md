# CONCERNS.md — Technical Debt & Issues

**Project:** ميدوز (Midoe)
**Last mapped:** 2026-07-30

---

## 1. Monolithic App Component

**File:** `App.tsx`  
**Severity:** Medium

`App.tsx` is ~800+ lines and serves as the central state hub for the entire admin application. It contains:
- View routing (switch statement)
- All global state (submissions, formData, drafts, selection)
- All callback handlers
- Sidebar/mobile menu logic
- Network/offline effects
- Theme, language, and draft management

**Risk:** Difficult to maintain, test, or refactor. Adding new features requires touching this central file.  
**Recommendation:** Extract view routing to a dedicated router component. Move sidebar logic to its own hook. Consider a lightweight state management solution.

---

## 2. Large Component Files

| File | Approximate Lines | Concern |
|------|-------------------|---------|
| `MaintenanceRecordCard.tsx` | 600+ | Too many responsibilities (editing, suggestions, typo detection, quick-add modals) |
| `MaintenanceEditPage.tsx` | 400+ | Mixed concerns (branch selection, record management, staging) |
| `HistoryPage.tsx` | 300+ | Search, filter, actions, and rendering in one component |

**Risk:** Hard to test individual behaviors. Changes risk unintended side effects.  
**Recommendation:** Extract sub-components and custom hooks. `MaintenanceRecordCard` could split into edit sections, suggestion logic, and modal handling.

---

## 3. No Centralized State Management

**Severity:** Medium

All state flows through prop drilling from `App.tsx`. No Redux, Zustand, Jotai, or Context-based state management for core data.

**Risk:** 
- Prop drilling through many layers (`App → View → Component → Child`)
- State updates require careful `structuredClone` to avoid mutation bugs
- No middleware for side effects, logging, or persistence

**Recommendation:** Consider React Context + useReducer for submission data, or adopt Zustand for simpler ergonomics.

---

## 4. No CI/CD Pipeline

**Severity:** Low-Medium

No GitHub Actions, GitLab CI, or other CI configuration found. Tests and builds run locally only.

**Risk:** Tests may rot without automated enforcement. Deployments are manual.

---

## 5. MaintenanceRecord Type — Missing Audit Fields

**Severity:** Low

The `MaintenanceRecord` interface in `types.ts` lacks:
- `createdAt` timestamp
- `lastModified` / `updatedAt` timestamp
- `modifiedBy` user identifier

**Impact:** Cannot sort by "last edited" or track who made changes. The `HistoryViewer` provides some tracking via `historyManager.ts` but this is in-memory and not persisted to the database.

**Recommendation:** Add audit fields to the type and update Supabase schema.

---

## 6. Monorepo Package Underutilization

**File:** `packages/form-progress/`  
**Severity:** Low

A monorepo package exists for `form-progress` with its own `package.json`, but it appears to duplicate `components/form-ui/FormProgress.tsx`. The package may not be actively consumed.

**Risk:** Maintenance burden of syncing two implementations.  
**Recommendation:** Either fully adopt the package (import it everywhere) or remove it to reduce confusion.

---

## 7. Test Coverage Gaps

**Severity:** Medium

Several critical components lack tests:
- `App.tsx` (800+ lines, no test)
- `MaintenanceRecordCard.tsx` (600+ lines, no dedicated test)
- `HistoryPage.tsx` (300+ lines, no test)
- `HistoryViewer.tsx` (no test)
- Most `utils/` modules (only a subset tested)

**Recommendation:** Add tests for high-complexity components. Set up coverage reporting.

---

## 8. Legacy File Artifacts

**Severity:** Low

Several files appear to be one-off scripts or legacy artifacts:
- `fix_footer.cjs` — Unknown purpose
- `update_editor.cjs`, `update_enhanced_input.cjs`, `update_mobile_editor.cjs` — Possible migration scripts
- `localize-labels.js`, `localize-tooltips.js` — Localization helpers (may be superseded by the i18n system)
- `tests/alias_merge_test.js`, `tests/draft_test.js` — Plain JS tests (others are TypeScript)

**Recommendation:** Audit and clean up. Move scripts to `scripts/` directory.

---

## 9. RTL/LTR Complexity

**Severity:** Low

The codebase uses `ltr:` and `rtl:` Tailwind prefixes extensively. While functional, this creates duplication:

```tsx
className="ltr:justify-end rtl:justify-start"
className="ltr:ps-6 rtl:pe-6 ltr:pe-2 rtl:ps-2"
```

**Risk:** Easy to miss one direction when adding new UI.  
**Recommendation:** Consider logical property CSS (`start`/`end` instead of `left`/`right`) where possible, or abstract common RTL patterns into utility components.

---

## 10. No Environment Validation

**Severity:** Low

`supabaseClient.ts` throws if env vars are missing, but there's no build-time validation or `.env.example` file to document required variables.

**Recommendation:** Add `.env.example` and build-time env validation.

---

## 11. Bundle Size Awareness

**Severity:** Low

Manual chunk splitting exists (`react-vendor`, `pdf`, `supabase`, `icons`), but no bundle analysis tool (e.g., `rollup-plugin-visualizer`) is configured.

**Recommendation:** Periodically audit bundle size with a visualizer.

---

*Generated by GSD map-codebase — 2026-07-30*
