---
phase: 01
status: secured
threats_found: 10
threats_closed: 7
threats_open: 2
threats_deferred: 1
last_audit: 2026-07-30
---

## Threat Register

| ID | Category | Component | Disposition | Status |
|----|----------|-----------|-------------|--------|
| T-01 | Spoofing | RLS Policies | `auth.role() = 'authenticated'` gates all reads/writes | **CLOSED** |
| T-02 | Tampering | logistics_operations UPDATE | Scoped to `created_by = auth.uid()` | **CLOSED** |
| T-03 | Tampering | Price columns | CHECK >= 0 constraints + Math.max(0) guards | **CLOSED** |
| T-04 | Tampering | recordId fallback | Changed from 0 to NULL for non-numeric IDs | **CLOSED** |
| T-05 | Info Disclosure | Customer PDF | Deferred — Task 9 not yet built. includeCosts gate required. | **DEFERRED** |
| T-06 | Info Disclosure | LogisticsTimelineView | All costs rendered for any auth user. Needs role-gating. | **OPEN** |
| T-07 | Repudiation | Audit trail | created_by/closed_by UUID columns + auth.getUser() inserts | **CLOSED** |
| T-08 | Elevation | company_machines DELETE | Split policies, still auth-only. Placeholder for admin role. | **OPEN** |
| T-09 | DoS | SQL Injection | Supabase client parameterizes — no raw SQL surface | **CLOSED** |
| T-10 | Tampering | maintenance_history read | Relies on maintenance_history RLS. Verified: table has RLS enabled. | **CLOSED** |

## Accepted Risks

### T-06: LogisticsTimelineView cost disclosure
**Risk:** Any authenticated user navigating to `/companies/{id}/logistics` can view rental costs, transportation costs, and internal notes.
**Acceptance rationale:** Implementing role-based access control (admin vs technician) requires infrastructure not yet in scope. All authenticated users currently have admin-equivalent access. This risk should be revisited when technician portal role segregation is implemented.
**Mitigation plan:** Add `isAdmin` check to the view when role infrastructure exists.

### T-08: company_machines DELETE available to all authenticated users
**Risk:** Any authenticated user can delete company machine inventory records.
**Acceptance rationale:** The RLS policies were split from FOR ALL into separate INSERT/UPDATE/DELETE policies, enabling future admin-role restrictions. The project has no `is_admin()` database function yet. This is a placeholder acknowledged in policy comments.
**Mitigation plan:** When admin role infrastructure is added, update DELETE/UPDATE policies to check `is_admin()`.

## Deferred Items

### T-05: Customer PDF cost disclosure
**Status:** Task 9 (PDF integration) not yet implemented.
**Requirement:** When built, `internalReportPdf.ts` must include costs; `pdfGenerator.ts` must pass `includeCosts: false` for customer-facing PDFs and exclude all logistics pricing.

## Audit Trail

### Security Audit 2026-07-30
| Metric | Count |
|--------|-------|
| Threats found | 10 |
| Closed | 7 |
| Open (accepted) | 2 |
| Deferred | 1 |

**Fix batch:** Code review `--fix` applied 8 security remediations:
- CR-01: RLS UPDATE scoped to `created_by = auth.uid()`
- CR-02: company_machines FOR ALL split into separate policies
- CR-03: CHECK >= 0 constraints on all price columns
- CR-04: recordId fallback changed from 0 to undefined (NULL)
- WR-01: Removed browser-time updated_at override
- WR-02: Added created_by/closed_by audit columns
- WR-03: Added index on customer_id
- WR-05: Math.max(0, …) guards on client-side price inputs

**Verification:** `npx tsc --noEmit` ✅, 303/303 tests ✅
