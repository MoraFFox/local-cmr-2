/**
 * Google Sheets Sync Utility
 *
 * Sends company data to the Supabase Edge Function which writes to Google Sheets.
 * Call `syncToSheets(companies)` from anywhere you save/update data.
 */

import { supabase } from "../supabaseClient";
import { FormData } from "../types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

interface SyncResult {
  success: boolean;
  tabs?: Array<{ name: string; rows: number }>;
  error?: string;
}

let syncInProgress = false;
let syncQueued = false;

/**
 * Time-based debounce for syncAllCompaniesToSheets: consecutive saves within
 * the window collapse into a single sync, so rapid edits don't hammer the
 * Edge Function or re-fetch the full companies table on every keystroke-level
 * save. Defaults to 20s. Set SYNC_DEBOUNCE_MS to override for tests/other callers.
 */
export const SYNC_DEBOUNCE_MS = 20000;
let syncTimer: ReturnType<typeof setTimeout> | null = null;
/** Shared pending promise so concurrent callers never get orphaned (see below). */
let debouncedSyncPromise: Promise<SyncResult> | null = null;
/** Resolver for debouncedSyncPromise — kept so a superseding sync can settle its callers. */
let debouncedResolve: ((result: SyncResult) => void) | null = null;

/**
 * Sync all given companies to Google Sheets.
 * Debounces: if called while a sync is in progress, queues one follow-up sync.
 */
export async function syncToSheets(companies: FormData[]): Promise<SyncResult> {
  if (!Array.isArray(companies) || companies.length === 0) {
    return { success: false, error: "No company data provided" };
  }

  if (syncInProgress) {
    syncQueued = true;
    return { success: false, error: "Sync already in progress, queued" };
  }

  syncInProgress = true;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return { success: false, error: "Not authenticated" };
    }

    const res = await fetch(`${SUPABASE_URL}/functions/v1/sync-sheets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ companies }),
    });

    const result: SyncResult = await res.json();

    if (!res.ok || !result.success) {
      console.error("Sheets sync failed:", result.error);
      return { success: false, error: result.error || `HTTP ${res.status}` };
    }

    console.log("Sheets sync complete:", result.tabs);
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Sheets sync error:", msg);
    return { success: false, error: msg };
  } finally {
    syncInProgress = false;
    if (syncQueued) {
      syncQueued = false;
      // Re-fetch fresh data for the queued sync (immediate, bypassing the
      // caller-facing debounce — this is an internal coalescing follow-up).
      // Clear any pending debounce timer so we don't run a redundant sync
      // when it fires later.
      if (syncTimer) {
        clearTimeout(syncTimer);
        syncTimer = null;
      }
      // A debounced call may still be pending with its timer set. That timer is
      // being cancelled right now, so settle its callers with this follow-up's
      // result — otherwise their awaits would hang forever.
      const pendingResolve = debouncedResolve;
      const pending = debouncedSyncPromise;
      debouncedSyncPromise = null;
      debouncedResolve = null;
      if (pending && pendingResolve) {
        runSyncAllCompanies().then(pendingResolve);
      } else {
        runSyncAllCompanies().catch(() => {});
      }
    }
  }
}

/**
 * Convenience: fetch all companies from Supabase, then sync them to Sheets.
 * Debounced: repeated calls within SYNC_DEBOUNCE_MS collapse into one sync
 * (the trailing call wins). The existing syncInProgress guard in syncToSheets
 * additionally coalesces overlapping requests.
 *
 * Single-flight: all callers within the window share the SAME pending promise,
 * so a second call never orphans the first caller's await (each call would
 * otherwise clearTimeout the previous timer and leave its promise unresolved).
 */
export function syncAllCompaniesToSheets(): Promise<SyncResult> {
  // A sync is already scheduled — share the same promise instead of resetting
  // the timer (and leaving the previous caller waiting forever).
  if (debouncedSyncPromise) return debouncedSyncPromise;
  if (syncTimer) clearTimeout(syncTimer);
  debouncedSyncPromise = new Promise((resolve) => {
    debouncedResolve = resolve;
    syncTimer = setTimeout(async () => {
      syncTimer = null;
      debouncedSyncPromise = null;
      debouncedResolve = null;
      resolve(await runSyncAllCompanies());
    }, SYNC_DEBOUNCE_MS);
  });
  return debouncedSyncPromise;
}

/**
 * Immediate, non-debounced full sync — for user-initiated actions (e.g. the
 * sidebar "Sync to Sheets" button) that should not wait out the debounce
 * window. Fire-and-forget auto-sync callers should keep using
 * syncAllCompaniesToSheets().
 */
export function syncAllCompaniesToSheetsNow(): Promise<SyncResult> {
  return runSyncAllCompanies();
}

async function runSyncAllCompanies(): Promise<SyncResult> {
  try {
    const { data: companies, error } = await supabase
      .from("companies")
      .select("*");

    if (error) {
      return { success: false, error: `Failed to fetch companies: ${error.message}` };
    }

    if (!companies || companies.length === 0) {
      return { success: false, error: "No companies found" };
    }

    const enriched: FormData[] = companies.map((c: any) => ({
      ...(c.form_data || c),
      id: c.id,
      companyName: c.form_data?.companyName || c.company_name || c.name || "",
    }));

    return syncToSheets(enriched);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}
