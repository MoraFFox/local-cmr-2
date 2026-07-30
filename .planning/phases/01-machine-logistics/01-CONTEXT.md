# Phase 1: Machine Logistics Workflow - Context

**Gathered:** 2026-07-30
**Status:** Ready for planning

## Phase Boundary

Implement a Machine Logistics workflow as a separate logistics layer alongside maintenance records. This feature manages machine movement (pickup, delivery, return), replacement machines, rental pricing, transportation costs, and automatic cost calculations. It supports open-in-one-record / close-in-another-record patterns using maintenance record visit dates as the source of truth for all business calculations.

**This IS:** A logistics operation manager embedded in the maintenance record form, plus a customer-level timeline view, plus a company machine inventory settings page.

**This is NOT:** Part of the repair logic itself. Not a simple form section — it is an independent, event-driven operation tracker.

---

## Requirements (locked via PRD)

See the detailed PRD provided by the user. Key acceptance criteria:

- Machine Logistics step exists in the maintenance workflow (editor + wizard)
- Users can open new logistics operations from a maintenance record
- Users can close existing open operations from later maintenance records
- System calculates rental duration using maintenance record visit dates (never browser/server time)
- Daily rental price = monthly rental price ÷ 30 (auto-calculated)
- Total rental cost = billable days × daily rental price (auto-calculated)
- System supports historical records entered in the past
- Internal PDF includes all logistics costs
- Customer PDF hides all internal logistics costs
- Supports multiple simultaneous open operations per customer
- Backfill: existing records can have logistics operations added
- Available in admin AND technician portal

**In scope:**
- `logistics_operations` Supabase table with RLS
- `company_machines` Supabase table for replacement machine inventory
- Logistics section in `MaintenanceRecordEditor` (stepper step 7, between Supervisor and Notes)
- Logistics section in `MaintenanceRecordCard` (collapsible, before Notes)
- Customer-level logistics timeline view (open + closed operations)
- `/settings/machines` route + sidebar for company machine management
- Three-scenario operation type selector (Pickup+Deliver / Deliver only / Pickup only)
- Cost calculations: rental duration, billable days, rental cost, transportation costs, total logistics cost
- Internal PDF: logistics section with all costs
- Customer PDF: logistics service info only, no costs
- History viewer integration

**Out of scope:**
- "Lost" and "Damaged" operation statuses (deferred)
- Automated notifications/alerts for open operations
- GPS tracking of machines

---

## Implementation Decisions

### Data Model
- **D-01:** Separate `logistics_operations` table in Supabase — independent lifecycle, referenced via `openedByMaintenanceRecordId` / `closedByMaintenanceRecordId`. Supports open-in-one-record, close-in-another.
- **D-02:** Separate `company_machines` table for replacement machine inventory.
- **D-03:** `MaintenanceRecord` type stays clean. No `logisticsOperationId` field on the record. All references live in the operations table.
- **D-04:** Multiple simultaneous open operations per customer are allowed.

### UI Placement
- **D-05:** In `MaintenanceRecordEditor`, insert as stepper step 7 between Supervisor (6) and Notes (8, formerly 7). Former steps 7 (Notes) and 8 (Photos) shift to 8 and 9.
- **D-06:** In `MaintenanceRecordCard` (used in wizard Step 5 and branch cards), add as a collapsible section before the Notes textarea.
- **D-07:** Section is always visible — collapsed state shows "No logistics operations" when empty. No activation button needed.
- **D-08:** Operation type selector uses three visual cards (matching the company/client paidBy card pattern in the Payment step).

### Lookup & Timeline
- **D-09:** Operation lookup is by customer. When opening a new record, query `logistics_operations WHERE customerId = X`.
- **D-10:** Dedicated customer-level timeline view showing all open and closed logistics operations for a company.

### Machine Management
- **D-11:** New `/settings/machines` route with sidebar navigation item. Standalone page for managing company-owned replacement machines (add, edit, delete, view status).

### Portal & History
- **D-12:** Machine Logistics is available in both admin and technician portals.
- **D-13:** Existing records can be backfilled — logistics operations can be created for historical maintenance records.

### PDF Behavior
- **D-14:** Internal PDF (`internalReportPdf.ts`): full logistics section with operation type, dates, machine details, rental duration/cost, transportation costs, total logistics cost.
- **D-15:** Customer PDF (`pdfGenerator.ts` with `includeCosts: false`): service-level info only (pickup/delivery status, machine details, technician notes). NO pricing, costs, or internal data.

### Calculations (all automatic, date-sourced from maintenance record visit dates)
- **D-16:** Daily rental price = monthly rental price ÷ 30
- **D-17:** Rental duration = closing record visit date − opening record visit date (stored as days, hours, minutes)
- **D-18:** Billable days derived from rental duration per company billing policy
- **D-19:** Total rental cost = billable days × daily rental price
- **D-20:** Total logistics cost = pickup cost + return cost + rental cost

---

## Canonical References

### PRD / Specs
- The user's PRD (embedded in the discuss-phase prompt) — complete feature specification with scenarios, data model, business rules, and acceptance criteria

### Existing Code (integration points)
- `types.ts` — `MaintenanceRecord`, `Part`, `Service` types
- `components/MaintenanceRecordEditor.tsx` — 8-step stepper, insert before Notes step
- `components/MaintenanceRecordCard.tsx` — collapsible sections pattern
- `src/views/wizard/Step5_MaintenanceHistory.tsx` — uses MaintenanceRecordCard
- `src/views/FormWizardView.tsx` — wizard routing, step rendering, actions
- `utils/costAggregation.ts` — `AggregatedCosts` type, `aggregateCosts`, `getRecordCostSummary`
- `utils/internalReportPdf.ts` — internal PDF with KPI cards, financial sections, tech summary
- `utils/pdfGenerator.ts` — customer-facing PDF with `options.includeCosts` toggle
- `utils/pdfTheme.ts` — shared PDF styling (BRAND colors, section headers, KPI cards)
- `components/AppRouter.tsx` — route definitions
- `src/views/Sidebar.tsx` — sidebar navigation items
- `constants.ts` — `NAV_ITEMS`, `partsList`, `servicesList`
- `supabaseClient.ts` — Supabase client initialization

### Styling Patterns
- `.planning/codebase/CONVENTIONS.md` — Tailwind utility-first, RTL/LTR prefixes, component patterns
- PaidBy card selector pattern in `MaintenanceRecordEditor.tsx` step 5 — reusable for operation type cards
- Stepper pattern in `MaintenanceRecordEditor.tsx` — extend STEPPER_STEPS array

---

## Existing Code Insights

### Reusable Assets
- **Stepper component** (`components/ui/Stepper.tsx`) — extend with new logistics step
- **CollapsibleSection** (`components/CollapsibleSection.tsx`) — for the always-visible logistics section in record cards
- **Card pattern** (`components/Card.tsx`) — for the settings/machines page
- **PaidBy card selector** — the visual card pattern in step 5 of MaintenanceRecordEditor is the template for the three-scenario logistics operation type selector
- **ConfirmDialog** (`components/ui/ConfirmDialog.tsx`) — for close/delete confirmations
- **EmptyState** (`components/EmptyState.tsx`) — for "No logistics operations" message
- **useToast** (`components/ToastContext.tsx`) — for success/error feedback
- **useMergedCatalog** (`hooks/useCustomCatalog.ts`) — pattern for merging DB items with hardcoded options (relevant for company_machines)

### Established Patterns
- **Prop drilling from App.tsx** — state flows App → View → Component. New features pass data the same way.
- **Lazy-loaded views** in App.tsx — new `/settings/machines` route follows this pattern
- **Supabase RLS + migrations** — new tables need migration files + RLS policies
- **RTL-aware Tailwind** — use `ltr:`/`rtl:` prefixes for directional styles
- **Arabic-first UI** — all labels in Arabic, English added via i18n system

### Integration Points
- **Route registration**: `components/AppRouter.tsx` + `App.tsx` view switch
- **Sidebar**: `src/views/Sidebar.tsx` nav items
- **Editor stepper**: `STEPPER_STEPS` in `MaintenanceRecordEditor.tsx`
- **Wizard**: `FormWizardView.tsx` step rendering + `WizardStepActions` type
- **PDF**: Both `internalReportPdf.ts` and `pdfGenerator.ts` need new sections
- **Cost aggregation**: `AggregatedCosts` type needs logistics cost fields

### Concerns to Address
- `MaintenanceRecordCard.tsx` is already 600+ lines (CONCERNS.md #2) — logistics section should be a separate sub-component
- `App.tsx` is 800+ lines (CONCERNS.md #1) — use lazy-loaded view for `/settings/machines`
- No centralized state management (CONCERNS.md #3) — logistics hook should be self-contained

---

## Specific Ideas

- The "three visual cards" for operation type should match the paidBy selector cards: large icon, title, subtitle, selected state with checkmark badge
- The logistics timeline should show operations as a chronological list with open/closed status badges, linking to the source maintenance records
- Daily rate of 30 days/month is a fixed business rule — not configurable
- Transportation costs are manually entered by the user (not auto-calculated)

---

## Deferred Ideas

- "Lost" and "Damaged" operation statuses — future phase
- Automated alerts for long-open operations — future phase
- GPS/map tracking for machine location — future phase
- Export logistics report as standalone PDF — future phase
- Machine maintenance/repair history (separate from logistics) — future phase

---

*Phase: 01-Machine Logistics Workflow*
*Context gathered: 2026-07-30*
