-- Migration: Logistics — structured maintenance close data (issues / services / parts)
-- Replaces the free-text `work_done` with structured lists while keeping `work_done`
-- as a composed summary for backward compatibility (reports/PDFs).

ALTER TABLE logistics_operations ADD COLUMN IF NOT EXISTS maintenance_issues JSONB DEFAULT '[]'::jsonb;
ALTER TABLE logistics_operations ADD COLUMN IF NOT EXISTS maintenance_services JSONB DEFAULT '[]'::jsonb;
ALTER TABLE logistics_operations ADD COLUMN IF NOT EXISTS maintenance_parts JSONB DEFAULT '[]'::jsonb;
