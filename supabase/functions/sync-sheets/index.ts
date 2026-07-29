// @ts-ignore: Deno types
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore: Deno types
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { SignJWT, importPKCS8 } from "https://esm.sh/jose@5.6.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Credentials": "true",
};

const SHEETS_API_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

// ── Environment variable names ───────────────────────────────────────────────
// GOOGLE_SERVICE_ACCOUNT_KEY — the full JSON of the service account key
// GOOGLE_SHEETS_SPREADSHEET_ID — the Google Sheet ID from the URL

// ── Service Account JWT helpers ──────────────────────────────────────────────

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri: string;
}

let cachedAccessToken: { token: string; expiry: number } | null = null;

async function getAccessToken(key: ServiceAccountKey): Promise<string> {
  if (cachedAccessToken && Date.now() < cachedAccessToken.expiry - 60000) {
    return cachedAccessToken.token;
  }

  const now = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({
    scope: "https://www.googleapis.com/auth/spreadsheets",
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(key.client_email)
    .setSubject(key.client_email)
    .setAudience(key.token_uri)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(await importPKCS8(key.private_key, "RS256"));

  const res = await fetch(key.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google auth failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  cachedAccessToken = {
    token: data.access_token,
    expiry: now + (data.expires_in || 3600),
  };
  return data.access_token;
}

// ── Sheets API helpers ───────────────────────────────────────────────────────

/** Throw on non-OK Sheets API responses, including the error body for debugging. */
async function checkSheetsResponse(res: Response, label: string): Promise<void> {
  if (!res.ok) {
    const body = await res.text().catch(() => "<unreadable>");
    throw new Error(`Sheets API ${label} failed: HTTP ${res.status} — ${body.slice(0, 500)}`);
  }
}

/** Encode only the sheet name portion, keeping ! and : literal for API compatibility. */
function sheetRange(tabName: string, a1Notation: string): string {
  const encodedTab = encodeURIComponent(`'${tabName}'`);
  return `${encodedTab}!${a1Notation}`;
}

interface HighlightCondition {
  columnIndex: number;
  value: string;
  color: { red: number; green: number; blue: number };
}

/** Apply formatting to a tab: freeze header, bold header, company-group separators, conditional highlights, auto-resize. */
async function formatTab(
  token: string,
  spreadsheetId: string,
  tabName: string,
  headerCount: number,
  rows: string[][],
  highlightCondition?: HighlightCondition
): Promise<void> {
  if (headerCount === 0) return;

  const sheetIdRes = await fetch(
    `${SHEETS_API_BASE}/${spreadsheetId}?fields=sheets.properties`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  await checkSheetsResponse(sheetIdRes, `get sheetId for "${tabName}"`);
  const meta = await sheetIdRes.json();
  const sheet = (meta.sheets as Array<{ properties: { sheetId: number; title: string } }>)
    .find((s) => s.properties.title === tabName);
  if (!sheet) return;
  const sheetId = sheet.properties.sheetId;

  const requests: Array<Record<string, unknown>> = [];

  // Freeze header row
  requests.push({
    updateSheetProperties: {
      properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
      fields: "gridProperties.frozenRowCount",
    },
  });

  // Bold header row with dark espresso background + white text
  requests.push({
    repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: headerCount },
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 0.2, green: 0.15, blue: 0.1 },
          textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
        },
      },
      fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)",
    },
  });

  // Light cream background on all data rows
  if (rows.length > 0) {
    requests.push({
      repeatCell: {
        range: { sheetId, startRowIndex: 1, endRowIndex: rows.length + 1, startColumnIndex: 0, endColumnIndex: headerCount },
        cell: { userEnteredFormat: { backgroundColor: { red: 0.98, green: 0.96, blue: 0.93 } } },
        fields: "userEnteredFormat.backgroundColor",
      },
    });
  }

  // Company-group separators: darker background on first row of each new company
  // (detected by a change in column A value). Only for tabs that have data + Company column.
  if (rows.length > 1 && rows[0].length > 0) {
    let prevCompany = rows[0][0];
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] !== prevCompany) {
        prevCompany = rows[i][0];
        requests.push({
          repeatCell: {
            range: { sheetId, startRowIndex: i + 1, endRowIndex: i + 2, startColumnIndex: 0, endColumnIndex: headerCount },
            cell: { userEnteredFormat: { backgroundColor: { red: 0.91, green: 0.87, blue: 0.82 } } },
            fields: "userEnteredFormat.backgroundColor",
          },
        });
      }
    }
  }

  // Conditional highlight: single rule that auto-applies to any matching row
  // Uses addConditionalFormatRule so it scales to any number of rows (no batchUpdate limit).
  if (highlightCondition && rows.length > 0) {
    requests.push({
      addConditionalFormatRule: {
        rule: {
          ranges: [{
            sheetId,
            startRowIndex: 1,
            endRowIndex: rows.length + 1,
            startColumnIndex: 0,
            endColumnIndex: headerCount,
          }],
          booleanRule: {
            condition: {
              type: "TEXT_EQ",
              values: [{ userEnteredValue: highlightCondition.value }],
            },
            format: {
              backgroundColor: highlightCondition.color,
            },
          },
        },
        index: 0,
      },
    });
  }

  // Auto-resize columns
  requests.push({
    autoResizeDimensions: {
      dimensions: { sheetId, dimension: "COLUMNS", startIndex: 0, endIndex: headerCount },
    },
  });

  if (requests.length === 0) return;

  const fmtRes = await fetch(`${SHEETS_API_BASE}/${spreadsheetId}:batchUpdate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ requests }),
  });
  await checkSheetsResponse(fmtRes, `format "${tabName}"`);
}

async function ensureSheetHeaders(
  token: string,
  spreadsheetId: string,
  tabName: string,
  headers: string[]
): Promise<void> {
  // Check if tab exists
  const metaRes = await fetch(
    `${SHEETS_API_BASE}/${spreadsheetId}?fields=sheets.properties.title`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  await checkSheetsResponse(metaRes, `metadata for "${tabName}"`);
  const meta = await metaRes.json();
  const sheets: Array<{ properties: { title: string } }> = meta.sheets || [];
  const exists = sheets.some((s) => s.properties.title === tabName);

  if (!exists) {
    const addRes = await fetch(`${SHEETS_API_BASE}/${spreadsheetId}:batchUpdate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        requests: [{ addSheet: { properties: { title: tabName } } }],
      }),
    });
    await checkSheetsResponse(addRes, `create tab "${tabName}"`);
  }

  // Write headers to row 1
  const endCol = String.fromCharCode(64 + headers.length);
  const range = sheetRange(tabName, `A1:${endCol}1`);
  const headerRes = await fetch(
    `${SHEETS_API_BASE}/${spreadsheetId}/values/${range}?valueInputOption=RAW`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ values: [headers] }),
    }
  );
  await checkSheetsResponse(headerRes, `write headers "${tabName}"`);
}

async function clearAndWriteRows(
  token: string,
  spreadsheetId: string,
  tabName: string,
  headers: string[],
  rows: string[][]
): Promise<void> {
  await ensureSheetHeaders(token, spreadsheetId, tabName, headers);

  if (rows.length === 0) {
    // Clear everything below header
    const range = sheetRange(tabName, "A2:Z");
    const clearRes = await fetch(
      `${SHEETS_API_BASE}/${spreadsheetId}/values/${range}:clear`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    await checkSheetsResponse(clearRes, `clear "${tabName}"`);
    return;
  }

  // Write all rows starting at A2
  const endCol = String.fromCharCode(64 + headers.length);
  const writeRange = sheetRange(tabName, `A2:${endCol}${rows.length + 1}`);
  const writeRes = await fetch(
    `${SHEETS_API_BASE}/${spreadsheetId}/values/${writeRange}?valueInputOption=RAW`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ values: rows }),
    }
  );
  await checkSheetsResponse(writeRes, `write rows "${tabName}"`);

  // Clear any leftover rows below
  const clearRange = sheetRange(tabName, `A${rows.length + 2}:Z`);
  const clearRes = await fetch(
    `${SHEETS_API_BASE}/${spreadsheetId}/values/${clearRange}:clear`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  await checkSheetsResponse(clearRes, `clear leftovers "${tabName}"`);
}

// ── Data flatteners ──────────────────────────────────────────────────────────

function flattenCompanies(companies: Array<Record<string, unknown>>): string[][] {
  return companies.map((c) => [
    String(c.id ?? ""),
    String(c.companyName ?? c.company_name ?? ""),
    String(c.email ?? ""),
    String(c.taxNumber ?? c.tax_number ?? ""),
    String(c.location ?? ""),
    c.hasBranches ?? c.has_branches != null ? String(c.hasBranches ?? c.has_branches) : "",
    String(c.branchCount ?? c.branch_count ?? (Array.isArray(c.branches) ? c.branches.length : 0)),
    String(c.usesOurMachines ?? c.uses_our_machines ?? ""),
    String(c.machineOwnershipType ?? c.machine_ownership_type ?? ""),
    String(c.dailyLeaseCost ?? c.daily_lease_cost ?? ""),
  ]);
}

function flattenBranches(companies: Array<Record<string, unknown>>): string[][] {
  const rows: string[][] = [];
  for (const c of companies) {
    const branches = c.branches as Array<Record<string, unknown>> | undefined;
    if (!branches) continue;
    for (const b of branches) {
      rows.push([
        String(c.companyName ?? c.company_name ?? c.id ?? ""),
        String(b.id ?? ""),
        String(b.branchName ?? b.branch_name ?? ""),
        String(b.email ?? ""),
        String(b.taxNumber ?? b.tax_number ?? ""),
        String(b.location ?? ""),
        String(b.usesOurMachines ?? b.uses_our_machines ?? ""),
        String(b.machineOwnershipType ?? b.machine_ownership_type ?? ""),
        String(b.dailyLeaseCost ?? b.daily_lease_cost ?? ""),
        String(Array.isArray(b.maintenanceHistory) ? b.maintenanceHistory.length : 0),
        String(Array.isArray(b.baristas) ? b.baristas.length : 0),
        String(Array.isArray(b.contacts) ? b.contacts.length : 0),
      ]);
    }
  }
  return rows;
}

function flattenMaintenance(companies: Array<Record<string, unknown>>): string[][] {
  const rows: string[][] = [];
  for (const c of companies) {
    const companyName = String(c.companyName ?? c.company_name ?? c.id ?? "");
    const branches = c.branches as Array<Record<string, unknown>> | undefined;

    const mainHistory = c.maintenanceHistory as Array<Record<string, unknown>> | undefined;
    if (mainHistory) {
      for (const r of mainHistory) {
        rows.push(buildMaintenanceRow(companyName, "", r));
      }
    }

    if (branches) {
      for (const b of branches) {
        const branchName = String(b.branchName ?? b.branch_name ?? b.id ?? "");
        const branchHistory = b.maintenanceHistory as Array<Record<string, unknown>> | undefined;
        if (branchHistory) {
          for (const r of branchHistory) {
            rows.push(buildMaintenanceRow(companyName, branchName, r));
          }
        }
      }
    }
  }
  return rows;
}

function buildMaintenanceRow(
  companyName: string,
  branchName: string,
  r: Record<string, unknown>
): string[] {
  const services = Array.isArray(r.servicesPerformed ?? r.services_performed)
    ? (r.servicesPerformed ?? r.services_performed) as Array<Record<string, unknown>>
    : [];
  const parts = Array.isArray(r.partsReplaced ?? r.parts_replaced)
    ? (r.partsReplaced ?? r.parts_replaced) as Array<Record<string, unknown>>
    : [];

  return [
    companyName,
    branchName,
    String(r.maintenanceDate ?? r.maintenance_date ?? ""),
    String(r.baristaName ?? r.barista_name ?? ""),
    String(r.clientBaristaName ?? r.client_barista_name ?? ""),
    String(r.type ?? ""),
    r.hadProblem ?? r.had_problem ? "نعم" : "لا",
    String((r.problems as string[] | undefined)?.join("; ") ?? ""),
    r.partsWereReplaced ?? r.parts_were_replaced ? "نعم" : "لا",
    parts.map((p) => `${p.name ?? ""} x${p.count ?? 0}`).join("; "),
    services.map((s) => `${s.name ?? ""} x${s.count ?? 0}`).join("; "),
    r.problemSolved ?? r.problem_solved ? "نعم" : "لا",
    String(r.paidBy ?? r.paid_by ?? ""),
    String(r.visitZone ?? r.visit_zone ?? ""),
    String(r.visitRating ?? r.visit_rating ?? ""),
    String(r.recommendations ?? ""),
    String(r.notes ?? ""),
    String(r.nextVisitDate ?? r.next_visit_date ?? ""),
    String(r.technicianId ?? r.technician_id ?? ""),
  ];
}

function flattenBaristas(companies: Array<Record<string, unknown>>): string[][] {
  const rows: string[][] = [];
  for (const c of companies) {
    const companyName = String(c.companyName ?? c.company_name ?? c.id ?? "");
    const baristas = c.baristas as Array<Record<string, unknown>> | undefined;
    if (baristas) {
      for (const b of baristas) {
        rows.push([companyName, String(b.id ?? ""), String(b.name ?? ""), String(b.phone ?? ""), String(b.notes ?? "")]);
      }
    }
    const branches = c.branches as Array<Record<string, unknown>> | undefined;
    if (branches) {
      for (const branch of branches) {
        const branchName = String(branch.branchName ?? branch.branch_name ?? branch.id ?? "");
        const branchBaristas = branch.baristas as Array<Record<string, unknown>> | undefined;
        if (branchBaristas) {
          for (const b of branchBaristas) {
            rows.push([companyName, `${branchName} / ${b.id ?? ""}`, String(b.name ?? ""), String(b.phone ?? ""), String(b.notes ?? "")]);
          }
        }
      }
    }
  }
  return rows;
}

function flattenContacts(companies: Array<Record<string, unknown>>): string[][] {
  const rows: string[][] = [];
  for (const c of companies) {
    const companyName = String(c.companyName ?? c.company_name ?? c.id ?? "");
    const contacts = c.contacts as Array<Record<string, unknown>> | undefined;
    if (contacts) {
      for (const ct of contacts) {
        const phones = Array.isArray(ct.phoneNumbers ?? ct.phone_numbers)
          ? (ct.phoneNumbers ?? ct.phone_numbers) as Array<Record<string, unknown>>
          : [];
        rows.push([
          companyName, "", String(ct.name ?? ""), String(ct.position ?? ""),
          String(ct.customPosition ?? ct.custom_position ?? ""),
          phones.map((p) => String(p.number ?? "")).join("; "),
        ]);
      }
    }
    const branches = c.branches as Array<Record<string, unknown>> | undefined;
    if (branches) {
      for (const branch of branches) {
        const branchName = String(branch.branchName ?? branch.branch_name ?? branch.id ?? "");
        const branchContacts = branch.contacts as Array<Record<string, unknown>> | undefined;
        if (branchContacts) {
          for (const ct of branchContacts) {
            const phones = Array.isArray(ct.phoneNumbers ?? ct.phone_numbers)
              ? (ct.phoneNumbers ?? ct.phone_numbers) as Array<Record<string, unknown>>
              : [];
            rows.push([
              companyName, branchName, String(ct.name ?? ""), String(ct.position ?? ""),
              String(ct.customPosition ?? ct.custom_position ?? ""),
              phones.map((p) => String(p.number ?? "")).join("; "),
            ]);
          }
        }
      }
    }
  }
  return rows;
}

// ── Main handler ─────────────────────────────────────────────────────────────

interface SyncRequest {
  companies: Array<Record<string, unknown>>;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed", success: false }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const saKeyRaw = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");
    const spreadsheetId = Deno.env.get("GOOGLE_SHEETS_SPREADSHEET_ID");

    if (!saKeyRaw || !spreadsheetId) {
      return new Response(
        JSON.stringify({ success: false, error: "Google Sheets configuration missing on server" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const saKey: ServiceAccountKey = JSON.parse(saKeyRaw);
    const body: SyncRequest = await req.json();
    const { companies } = body;

    if (!Array.isArray(companies) || companies.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No company data provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = await getAccessToken(saKey);

    const sheetsDefs: Array<{ tab: string; headers: string[]; rows: string[][]; highlight?: HighlightCondition }> = [
      {
        tab: "الشركات",
        headers: ["المعرف", "اسم الشركة", "البريد الإلكتروني", "الرقم الضريبي", "الموقع", "لديه فروع", "عدد الفروع", "يستخدم أجهزتنا", "ملكية الجهاز", "تكلفة التأجير اليومي"],
        rows: flattenCompanies(companies),
      },
      {
        tab: "الفروع",
        headers: ["الشركة", "معرف الفرع", "اسم الفرع", "البريد الإلكتروني", "الرقم الضريبي", "الموقع", "يستخدم أجهزتنا", "ملكية الجهاز", "تكلفة التأجير اليومي", "عدد أعمال الصيانة", "عدد البارستا", "عدد جهات الاتصال"],
        rows: flattenBranches(companies),
      },
      {
        tab: "سجلات الصيانة",
        headers: ["الشركة", "الفرع", "التاريخ", "البارستا", "بارستا العميل", "النوع", "هل كان هناك مشكلة", "المشاكل", "هل تم استبدال القطع", "القطع", "الخدمات", "هل تم حل المشكلة", "الدفع بواسطة", "منطقة الزيارة", "التقييم", "التوصيات", "ملاحظات", "الزيارة القادمة", "معرف الفني"],
        rows: flattenMaintenance(companies),
        highlight: { columnIndex: 11, value: "لا", color: { red: 0.98, green: 0.88, blue: 0.88 } },  // Light red for unsolved problems
      },
      {
        tab: "البارستا",
        headers: ["الشركة", "المعرف", "الاسم", "الهاتف", "ملاحظات"],
        rows: flattenBaristas(companies),
      },
      {
        tab: "جهات الاتصال",
        headers: ["الشركة", "الفرع", "الاسم", "المنصب", "منصب مخصص", "أرقام الهواتف"],
        rows: flattenContacts(companies),
      },
    ];

    for (const def of sheetsDefs) {
      // Sort rows by first column (Company name) so related records are grouped
      def.rows.sort((a, b) => (a[0] || "").localeCompare(b[0] || ""));
      await clearAndWriteRows(token, spreadsheetId, def.tab, def.headers, def.rows);
      await formatTab(token, spreadsheetId, def.tab, def.headers.length, def.rows, def.highlight);
    }

    // ── Cleanup: delete old English-named tabs left over from previous versions ──
    // Non-fatal: if deletion fails, the main sync still succeeds.
    try {
      const oldTabNames = ["Companies", "Branches", "Maintenance Records", "Baristas", "Contacts"];
      const metaRes = await fetch(
        `${SHEETS_API_BASE}/${spreadsheetId}?fields=sheets.properties`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (metaRes.ok) {
        const meta = await metaRes.json();
        const sheets: Array<{ properties: { sheetId: number; title: string } }> = meta.sheets || [];
        const deleteRequests = sheets
          .filter((s) => oldTabNames.includes(s.properties.title))
          .map((s) => ({ deleteSheet: { sheetId: s.properties.sheetId } }));
        if (deleteRequests.length > 0) {
          const delRes = await fetch(`${SHEETS_API_BASE}/${spreadsheetId}:batchUpdate`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ requests: deleteRequests }),
          });
          await checkSheetsResponse(delRes, "delete old English tabs");
        }
      }
    } catch (cleanupErr) {
      console.error("Failed to delete old English tabs (non-fatal):", cleanupErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        tabs: sheetsDefs.map((d) => ({ name: d.tab, rows: d.rows.length })),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("sync-sheets error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
