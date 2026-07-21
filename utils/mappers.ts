/**
 * Shared data mapping and formatting utilities.
 * Extracted from App.tsx / FormWizardView.tsx to eliminate duplication.
 */

import { MaintenanceRecord, MaintenancePhoto, PortalSubmission } from "../types";

/**
 * Format a phone number string into a readable segmented format.
 * Cleans non-digits, then groups as XXXX-XXX-XXXX.
 */
export const formatPhoneNumber = (value: string): string => {
  const cleaned = value.replace(/\D/g, "");
  if (!cleaned) return "";

  const match = cleaned.match(/^(\d{0,4})(\d{0,3})(\d{0,4})$/);
  if (match) {
    return [match[1], match[2], match[3]].filter(Boolean).join("-");
  }
  return cleaned;
};

/**
 * Map a PortalSubmission (snake_case from Supabase) to a frontend
 * MaintenanceRecord (camelCase with typed photos).
 */
export const mapPortalToMaintenance = (
  sub: PortalSubmission,
): MaintenanceRecord => {
  const photos: MaintenancePhoto[] = [];

  // Typed photos from photo_entries (before/after)
  if (sub.photo_entries?.length) {
    photos.push(
      ...sub.photo_entries.map((entry) => ({
        url: entry.url,
        type: entry.type as "before" | "after",
      })),
    );
  }

  // Legacy photos, deduplicated by URL
  if (sub.photo_urls?.length) {
    const existingUrls = new Set(photos.map((p) => p.url));
    for (const url of sub.photo_urls) {
      if (!existingUrls.has(url)) {
        photos.push({ url, type: "legacy" } as MaintenancePhoto);
      }
    }
  }

  return {
    id: sub.id,
    maintenanceDate: sub.maintenance_date,
    notes: sub.notes || "",
    type: sub.type as "requested" | "scheduled",
    hadProblem: sub.had_problem || false,
    partsWereReplaced: sub.parts_were_replaced || false,
    problemSolved: sub.problem_solved || false,
    partsReplaced: sub.parts_replaced || [],
    paidBy: (sub.paid_by as "company" | "client") || "company",
    baristaName: sub.barista_name || "",
    clientBaristaName: sub.client_barista_name || "",
    visitRating: sub.visit_rating || 0,
    problems: sub.problems || [],
    visitZone: sub.visit_zone as "cairo" | "outside_cairo" | "el_sahel" | null,
    servicesPerformed: sub.services_performed || [],
    machines: sub.machines || [],
    supervisors: [],
    photos: photos.length > 0 ? photos : undefined,
    technicianId: sub.technician_id,
  };
};
