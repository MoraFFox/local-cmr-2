/**
 * useSubmissions - manages fetching, merging, and CRUD for company submissions.
 */
import { useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import type { FormData, Branch, PortalSubmission } from "../types";
import { mapPortalToMaintenance } from "../utils/mappers";
import {
  addToQueue,
  getQueue,
  removeFromQueue,
  getPendingCreations,
} from "../utils/offlineQueue";
import {
  syncToSheets,
  syncAllCompaniesToSheets,
} from "../utils/googleSheetsSync";
import { isValidDbId, isLocalId, validateSubmissionId } from "../utils/validation";
import { sanitizeObject } from "../utils/sanitization";
import { logger } from "../utils/logger";
import { useToast } from "../components/ToastContext";

type Submission = FormData & { created_at: string };

/**
 * Parse a maintenance date to epoch-ms, returning 0 on invalid/empty input.
 * Used in sort comparators so a malformed date can't produce NaN (which makes
 * Array#sort non-deterministic and can crash rendering downstream).
 */
const safeDateMs = (date: string | undefined): number => {
  if (!date) return 0;
  const ms = new Date(date).getTime();
  return Number.isNaN(ms) ? 0 : ms;
};

export function useSubmissions(isOnline: boolean) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  const fetchSubmissions = useCallback(async () => {
    setIsLoading(true);
    try {
      let serverData: Submission[] = [];
      let portalSubmissions: PortalSubmission[] = [];

      if (isOnline) {
        const { data: companies, error: companiesError } = await supabase
          .from("companies")
          .select("*")
          .order("created_at", { ascending: false });

        if (companiesError) {
          logger.error("Error fetching companies", companiesError, "data");
          showToast("خطأ في جلب بيانات الشركات", "error");
        } else {
          serverData =
            companies?.map((d) => ({
              ...d.form_data,
              id: d.id,
              created_at: d.created_at,
            })) || [];
        }

        const { data: portalData, error: subsError } = await supabase
          .from("maintenance_submissions")
          .select("*")
          .order("maintenance_date", { ascending: false });

        if (subsError) {
          logger.error("Error fetching submissions", subsError, "data");
          showToast("خطأ في جلب بيانات الصيانة", "error");
        } else {
          portalSubmissions = portalData || [];
        }
      }

      // Merge portal submissions into company/branch history
      const mergedData = serverData.map((company) => {
        const enriched = structuredClone(company) as Submission & { branches: Branch[] };
        const companySubs = portalSubmissions.filter(
          (s) => String(s.company_id) === String(company.id),
        );

        // Main office
        const mainOfficeSubs = companySubs
          .filter((s) => !s.branch_id)
          .map(mapPortalToMaintenance);
        const mainOfficeRecordIds = new Set(
          (enriched.maintenanceHistory || []).map((r) => r.id),
        );
        enriched.maintenanceHistory = [
          ...(enriched.maintenanceHistory || []),
          ...mainOfficeSubs.filter((r) => !mainOfficeRecordIds.has(r.id)),
        ].sort(
          (a, b) =>
            safeDateMs(b.maintenanceDate) - safeDateMs(a.maintenanceDate),
        );

        // Branches
        if (enriched.branches) {
          enriched.branches = enriched.branches.map((branch) => {
            const branchSubs = companySubs
              .filter((s) => String(s.branch_id) === String(branch.id))
              .map(mapPortalToMaintenance);
            const branchRecordIds = new Set(
              (branch.maintenanceHistory || []).map((r) => r.id),
            );
            return {
              ...branch,
              maintenanceHistory: [
                ...(branch.maintenanceHistory || []),
                ...branchSubs.filter((r) => !branchRecordIds.has(r.id)),
              ].sort(
                (a, b) =>
                  safeDateMs(b.maintenanceDate) - safeDateMs(a.maintenanceDate),
              ),
            };
          });
        }

        return enriched;
      });

      // Local queue handling
      const localPending = await getPendingCreations();
      const queue = await getQueue();
      const deletedIds = new Set(
        queue
          .filter((q) => q.action === "DELETE")
          .map((q) => q.payload as number),
      );

      const finalSubmissions = [
        ...localPending,
        ...mergedData.filter((d) => !deletedIds.has(d.id!)),
      ];

      setSubmissions(finalSubmissions);
    } catch (e) {
      logger.error("Unexpected error fetching submissions", e, "data");
      showToast("حدث خطأ غير متوقع أثناء جلب البيانات", "error");
      setSubmissions(await getPendingCreations());
    } finally {
      setIsLoading(false);
    }
  }, [isOnline, showToast]);

  /**
   * Create or update a submission. Handles sanitization, Supabase insert/update,
   * offline queue fallback, Google Sheets sync, and user-facing toasts.
   * Returns true on success, false on failure.
   */
  const createSubmission = useCallback(
    async (formData: FormData): Promise<boolean> => {
      const { id, pendingSync, ...dataToSubmit } = formData;
      const sanitizedData = sanitizeObject(dataToSubmit);
      const submissionPayload = { form_data: sanitizedData };

      try {
        // Offline path — if we can't reach the server, queue locally
        if (!isOnline) {
          throw new Error("Offline");
        }

        const idValidation = validateSubmissionId(formData.id);

        if (idValidation.action === "update" && formData.id) {
          const { error: updateError } = await supabase
            .from("companies")
            .update(submissionPayload)
            .eq("id", formData.id);
          if (updateError) throw updateError;
        } else if (idValidation.action === "insert") {
          const { error: insertError } = await supabase
            .from("companies")
            .insert([submissionPayload]);
          if (insertError) throw insertError;
        } else {
          throw new Error("Offline");
        }

        showToast("تم الحفظ بنجاح!", "success");

        // Fire-and-forget Google Sheets sync
        syncAllCompaniesToSheets().catch(() => {});

        return true;
      } catch (e: unknown) {
        const err = e as Error;
        const isOfflineErr =
          err.message === "Offline" ||
          err.message === "Failed to fetch";

        if (isOfflineErr || !isOnline) {
          logger.info(
            "Network error or offline, queueing submission",
            { formDataId: formData.id },
            "sync",
          );

          if (isValidDbId(formData.id)) {
            await addToQueue("UPDATE", formData);
            showToast("أنت غير متصل. تم حفظ التغييرات محلياً", "warning");
          } else if (isLocalId(formData.id)) {
            await addToQueue("UPDATE", formData);
            showToast("تم تحديث التغييرات المحلية", "info");
          } else {
            await addToQueue("CREATE", formData);
            showToast("أنت غير متصل. تم إنشاء التقرير محلياً", "warning");
          }

          return true; // Treated as success for UX — data is queued
        }

        logger.error("Submission error", err, "submission");
        showToast(`خطأ في حفظ النموذج: ${err.message}`, "error");
        return false;
      }
    },
    [isOnline, showToast],
  );

  const updateCompany = useCallback(
    async (updatedCompany: FormData): Promise<void> => {
      if (!isValidDbId(updatedCompany.id)) {
        showToast("معرف الشركة غير صالح", "error");
        return;
      }

      try {
        if (!isOnline) {
          setSubmissions((prev) =>
            prev.map((sub) =>
              sub.id === updatedCompany.id
                ? { ...updatedCompany, created_at: sub.created_at }
                : sub,
            ),
          );
          await addToQueue("UPDATE", updatedCompany);
          return;
        }

        const { error } = await supabase
          .from("companies")
          .update({ form_data: updatedCompany })
          .eq("id", updatedCompany.id);

        if (error) throw error;

        setSubmissions((prev) =>
          prev.map((sub) =>
            sub.id === updatedCompany.id
              ? { ...updatedCompany, created_at: sub.created_at }
              : sub,
          ),
        );

        // Fire-and-forget Google Sheets sync
        syncAllCompaniesToSheets().catch(() => {});
      } catch (e: unknown) {
        const err = e as Error;
        logger.error("Error updating company", err, "data");
        showToast("تم تحديث الشركة محلياً وستتم المزامنة لاحقاً.", "warning");

        setSubmissions((prev) =>
          prev.map((sub) =>
            sub.id === updatedCompany.id
              ? { ...updatedCompany, created_at: sub.created_at }
              : sub,
          ),
        );
        await addToQueue("UPDATE", updatedCompany);
      }
    },
    [isOnline, showToast],
  );

  const deleteSubmission = useCallback(
    async (id: number): Promise<void> => {
      try {
        if (!isOnline) throw new Error("Offline");

        if (id < 0) {
          await addToQueue("DELETE", id);
          await fetchSubmissions();
          return;
        }

        const { error } = await supabase
          .from("companies")
          .delete()
          .eq("id", id);

        if (error) throw error;

        await fetchSubmissions();
      } catch (e: unknown) {
        const err = e as Error;
        if (
          err.message === "Offline" ||
          err.message === "Failed to fetch" ||
          !isOnline
        ) {
          await addToQueue("DELETE", id);
          showToast("أنت غير متصل. تم وضع الحذف في قائمة الانتظار", "warning");
          await fetchSubmissions();
        } else {
          logger.error("Error deleting", err, "data");
          showToast(`تعذر الحذف: ${err.message}`, "error");
        }
      }
    },
    [isOnline, showToast, fetchSubmissions],
  );

  return {
    submissions,
    setSubmissions,
    isLoading,
    fetchSubmissions,
    createSubmission,
    updateCompany,
    deleteSubmission,
  };
}
