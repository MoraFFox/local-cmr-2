# Phase 1: Machine Logistics Workflow - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-30
**Phase:** 01-Machine Logistics Workflow
**Areas discussed:** UI Integration, Data Model, Operation Lookup, Machine Inventory, Section Visibility, Record Reference, Operation Type UI, Management UI, Settings Route, Logistics Timeline, Multi-operation Support, Backfill, Portal Coverage

---

## UI Integration — Where does the logistics step live?

| Option | Description | Selected |
|--------|-------------|----------|
| Section within editor | Inserted as a stepper step + collapsible section in record cards | ✓ |
| Separate wizard step | New wizard step between Maintenance History and Review | |
| Both | Wizard step + per-record section | |

**User's choice:** Section within the maintenance record form (both editor and wizard). Before the Notes step.

---

## Data Model — Separate table or inline?

| Option | Description | Selected |
|--------|-------------|----------|
| Separate `logistics_operations` table | Independent entity with openedBy/closedBy record references | ✓ |
| Fields on `MaintenanceRecord` | Logistics data inline on the record type | |

**User's choice:** Option A — separate table. Clean architecture, event-driven, supports open/close across records.

---

## Operation Lookup Scope

| Option | Description | Selected |
|--------|-------------|----------|
| By customer | Show all open operations for the company/branch | ✓ |
| By machine | Show only operations for the specific machine | |

**User's choice:** By customer. Simple, matches the business domain.

---

## Replacement Machine Tracking

| Option | Description | Selected |
|--------|-------------|----------|
| Separate `company_machines` table | Reusable inventory, track status/history | ✓ |
| Inline fields on operation | Machine details stored per operation | |

**User's choice:** Separate table. Enables fleet management and reuse across operations.

---

## Section Visibility

| Option | Description | Selected |
|--------|-------------|----------|
| Always visible | Collapsed section with empty state, always shown | ✓ |
| Triggered by button | Hidden until user clicks "Add Logistics" | |

**User's choice:** Always visible. More discoverable, consistent UX.

---

## Record Reference

| Option | Description | Selected |
|--------|-------------|----------|
| Keep record clean | All references in operations table only | ✓ |
| Add `logisticsOperationId` | Record carries a reference to its operation | |

**User's choice:** Keep record clean. Purer separation of concerns.

---

## Operation Type UI

| Option | Description | Selected |
|--------|-------------|----------|
| Three visual cards | Cards with icons, matching paidBy selector pattern | ✓ |
| Radio buttons | Compact, standard | |
| Dropdown | Minimal space | |

**User's choice:** Three visual cards. Matches existing Payment step pattern.

---

## Machine Management UI Location

| Option | Description | Selected |
|--------|-------------|----------|
| New `/settings/machines` route | Standalone page with sidebar item | ✓ |
| Under User Access tab | Alongside Custom Catalog Manager | |
| Inside logistics section | Modal from the logistics section | |

**User's choice:** New settings page with dedicated route.

---

## Logistics Timeline View

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated timeline view | Lists all operations for a customer, open and closed | ✓ |
| In-record only | Only visible inside maintenance records | |

**User's choice:** Dedicated timeline view. Customer-level visibility of all operations.

---

## Additional Decisions

| Area | Decision |
|------|----------|
| Multiple operations | Allowed — customer can have 2+ open at once |
| Historic backfill | Yes — existing records can be backfilled |
| Portal coverage | All — admin AND technician portals |
| Date source | Maintenance record visit dates only (never browser/server time) |
| Daily rate | Monthly ÷ 30 (fixed, not configurable) |

---

## Claude's Discretion

- Daily rental price formula (monthly ÷ 30) is locked by the PRD
- PDF section layout follows existing internalReportPdf.ts patterns (KPI cards, financial summary, section headers)
- Operation status color coding: Open = amber, Closed = leaf green (matching existing status badge patterns)

---

## Deferred Ideas

- "Lost" and "Damaged" operation statuses — future phase
- Automated alerts for long-open operations — future phase
- GPS/map tracking for machine location — future phase
- Export logistics report as standalone PDF — future phase
- Machine maintenance/repair history — future phase
