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
      // Re-fetch fresh data for the queued sync
      syncAllCompaniesToSheets().catch(() => {});
    }
  }
}

/**
 * Convenience: fetch all companies from Supabase, then sync them to Sheets.
 */
export async function syncAllCompaniesToSheets(): Promise<SyncResult> {
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
