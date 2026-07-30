# ARCHITECTURE.md — System Design & Patterns

**Project:** ميدوز (Midoe)
**Last mapped:** 2026-07-30

---

## Architectural Pattern

**Single-Page Application (SPA)** with client-side routing, backed by Supabase BaaS (Backend-as-a-Service). No traditional backend server — all business logic runs in the browser with Supabase handling auth, database, storage, and serverless functions.

---

## Layer Architecture

```
┌─────────────────────────────────────────────┐
│                  index.tsx                   │  ← Entry point + providers
├─────────────────────────────────────────────┤
│               AppRouter.tsx                  │  ← Auth gate + route branching
├─────────────────────────────────────────────┤
│                  App.tsx                     │  ← Main orchestrator (state hub)
├─────────────────────────────────────────────┤
│              src/views/*.tsx                 │  ← View-level components
├─────────────────────────────────────────────┤
│            components/*.tsx                  │  ← Reusable UI components
├─────────────────────────────────────────────┤
│         hooks/          utils/               │  ← Data & business logic
├─────────────────────────────────────────────┤
│          supabaseClient.ts                   │  ← API/backend interface
├─────────────────────────────────────────────┤
│         Supabase (BaaS)                      │  ← Auth, DB, Storage, Functions
└─────────────────────────────────────────────┘
```

---

## Entry Points

| File | Role |
|------|------|
| `index.tsx` | React root mount, providers, router setup |
| `AppRouter.tsx` | Auth check, role-based routing (admin vs technician) |
| `App.tsx` | Main admin shell: sidebar, view routing, global state |

### Provider Hierarchy (from `index.tsx`)

```
ErrorBoundary
  └─ ToastProvider
      └─ UndoQueueProvider
          └─ BrowserRouter
              └─ LanguageProvider
                  └─ AppRouter
                      └─ App (admin) or TechnicianPortal
```

---

## Routing

**Library:** `react-router-dom` v6

### Route Structure

| Path | View | Component |
|------|------|-----------|
| `/` | history | `HistoryView` |
| `/baristas` | baristas | `BaristasView` |
| `/baristas/:name` | barista-details | `BaristaDetailsView` |
| `/users` | technicians | `UserAccessView` |
| `/companies/new` | form | `FormWizardView` |
| `/companies/:id` | details | `SubmissionDetailsView` |
| `/companies/:id/maintenance` | maintenance-edit | `MaintenanceEditView` |
| `/print` | print | `PrintView` |
| `/technician/*` | technician | `TechnicianPortal` (separate) |
| `/admin/invite` | invite | `InviteSignup` |
| `/admin/recovery/*` | recovery | `EmergencyAdminRecovery` |
| `/reset-password` | reset | `ResetPassword` |

### View Dispatch Pattern

`App.tsx` uses a `renderCurrentView()` switch statement. The `ViewKey` type in `constants.ts` maps views to paths. `NAV_ITEMS` defines sidebar navigation items.

---

## State Management

**No centralized state library** (no Redux, Zustand, etc.). State is managed through:

1. **App.tsx as state hub:** Most global state lives in `useState` hooks at the App level and is passed down via props
2. **Custom hooks:** `useSubmissions`, `useDrafts`, `useTechnicians`, `useOfflineQueue` encapsulate data fetching and related state
3. **Context providers:** `ToastProvider`, `UndoQueueProvider`, `LanguageProvider`, `KeyboardShortcutsHelpProvider` for cross-cutting concerns
4. **Local component state:** Form-level state in wizard steps, UI state in individual components

### Key State Flows

```
Supabase DB ←→ useSubmissions (hook) → App.tsx (state) → Views → Components
                                         ↓
                                    setSubmissions (updates propagate down)
```

---

## Data Flow

### Company/Submission Data
- `FormData` type (in `types.ts`) is the central data model
- Companies have branches, each branch has maintenance history
- Data fetched via `useSubmissions` hook → stored in App.tsx → passed to views
- Mutations (create/update/delete) call Supabase directly, then update local state

### Maintenance Records
- Nested within `FormData.branches[].maintenanceHistory` and `FormData.maintenanceHistory`
- `MaintenanceRecord` type has recursive `followUpVisits`
- Editing flow: `MaintenanceEditPage` → `MaintenanceRecordList` → `MaintenanceRecordEditor`

### Offline Flow
```
User Action → useOfflineQueue (queues if offline)
                    ↓ (when back online)
              processOfflineQueue → Supabase → refresh local state
```

---

## Design Patterns

| Pattern | Where Used |
|---------|-----------|
| **Lazy Loading** | All views in `App.tsx` use `React.lazy()` + `Suspense` |
| **Custom Hooks** | Data fetching, network status, drafts, offline queue |
| **Compound Components** | Wizard steps share context via `WizardJumpContext` |
| **Render Props** | `CollapsibleCard`, `CollapsibleSection` |
| **Portal Rendering** | Floating menus, modals rendered to `document.body` |
| **Controlled Components** | All form inputs are controlled via React state |
| **Memoization** | `React.memo`, `useMemo`, `useCallback` throughout |

---

## Multi-Step Wizard

The form wizard (`FormWizardView`) has 6 steps:

| Step | Component | Purpose |
|------|-----------|---------|
| 1 | `Step1_CompanyInfo` | Company name, email, tax, location |
| 2 | `Step2_Branches` | Branch configuration |
| 3 | `Step3_Warehouse` | Warehouse details |
| 4 | `Step4_Baristas` | My technicians |
| 5 | `Step5_MaintenanceHistory` | Maintenance records per branch |
| 6 | `Step6_Review` | Review all data before submission |

Cross-step navigation via `WizardJumpContext`.

---

## Technician Portal

Separate UI flow at `/technician/*`:
- `TechnicianPortal.tsx` — Main container
- `TechnicianAuthContext.tsx` — Auth state
- Multi-step form: `Step1_Context` → `Step2_WorkLog` → `Step3_Summary`
- Camera/photo upload via `CameraBottomSheet` + `PhotoUpload`
- Separate from admin UI, with its own components in `components/technician-portal/`

---

## i18n / Localization

- **Languages:** Arabic (primary), English
- **Direction:** RTL/LTR dynamic switching
- **Translation files:** `utils/arabicTranslations.ts`, `utils/englishTranslations.ts`
- **Context:** `LanguageContext.tsx` provides `t()`, `language`, `dir`
- **Audit tool:** `scripts/checkI18n.ts` for finding missing translations
- **Pre-commit hook:** Validates i18n on staged files

---

*Generated by GSD map-codebase — 2026-07-30*
