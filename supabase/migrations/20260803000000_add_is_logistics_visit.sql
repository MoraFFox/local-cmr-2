-- Add is_logistics_visit flag to maintenance_submissions.
-- Logistics-only visits (machine pickup/delivery/replacement) are tracked in
-- the app but excluded from every PDF/print report.
ALTER TABLE public.maintenance_submissions
  ADD COLUMN IF NOT EXISTS is_logistics_visit BOOLEAN NOT NULL DEFAULT false;
