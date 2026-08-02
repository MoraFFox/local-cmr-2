# PDF Export Feature

## Overview
The application now generates professional, well-formatted PDF reports instead of browser print screenshots.

## Features

### Two Report Versions

1. **Internal Report (with costs)**
   - Includes all financial data
   - Shows lease costs, part costs, service costs
   - Marked as "CONFIDENTIAL - Internal Use Only"
   - For company internal use

2. **Client Report (without costs)**
   - Hides all cost information
   - Shows services provided and maintenance history
   - Professional format for client delivery
   - Marked as "Service Report"

### Export Options

#### Full Company Report
- Complete company profile
- All branches (if applicable)
- Complete maintenance history
- Staff assignments
- Contact information

#### Individual Branch Report
- Branch-specific information
- Branch maintenance history
- Assigned staff with ratings
- Branch contacts
- Machine ownership details

## How to Use

1. Navigate to **Submission Details** page
2. Click **"Export Full Report"** dropdown
3. Choose:
   - **Internal Report** - includes all costs
   - **Client Report** - hides costs
4. Pick the format:
   - **PDF** - pixel-perfect branded layout (downloads automatically)
   - **Word** - same content as a clean, editable `.docx` document

For individual branches:
1. Expand a branch card
2. Click **"Print Branch"** dropdown
3. Choose report type + format (PDF or Word)
4. File downloads with branch-specific data

Each maintenance visit also has a **Visit Report** dropdown with the same PDF/Word choice.

## Word (.docx) Export

Every report — company, branch, single visit, and the bulk multi-record export on the **All Records** page — is available as a **Word document** in addition to PDF.

- Generated with the `docx` library, fully in the browser (no server needed)
- The library is **lazy-loaded**: it only downloads when someone clicks an export "Word" button
- Same report modes and content as the PDFs (internal / cost / client)
- Clean, editable structure: headings, info tables, and per-visit detail blocks
- Arabic text is preserved with proper right-to-left shaping in Word
- Photos are embedded in the client reports and per-visit reports (Word keeps them, like the PDF)
- File naming mirrors the PDFs, e.g. `CompanyName_Internal_Report_YYYY-MM-DD.docx`

> Note: Word documents are intentionally structured for editing — they are not
> pixel-identical to the PDFs (which use a two-column card layout). All the
> same data is present.

### Word Export of the Missing-Data Form

The **"استكمال بيانات ناقصة"** buttons (company + each branch) now offer both formats:
- **PDF** — the interactive AcroForm form (fillable fields, can be re-uploaded for parsing)
- **Word** — a clean label/blank-table version of the same missing fields, ready to type into

When nothing is missing, both show the "no missing data" toast instead of a file.
> Note: only the PDF version can be re-imported via "رفع PDF مكتمل"; Word files
> are for filling/editing locally, not for re-parsing.

### Configurable Word Export Template

The **Settings → "قالب تصدير Word"** tab lets you customize every Word export
(company / branch / visit / batch reports, the missing-data form and the work
order). Changes apply immediately to new exports and are stored in the browser
(localStorage, like the theme):

- **Company logo** — upload a PNG/JPG; it is downscaled (max 400px) and embedded
  at the top of every Word export (it replaces the brand text on the work order).
- **Custom footer text** — replaces the default footer text in every Word
  export. Leave empty for the default: no footer on internal/cost reports, and
  "Service Report" on client reports.
- **Label language** — English (default) or Arabic for the report structure
  labels: section titles, table headers, "Generated / Period", cost breakdown,
  batch summary, work-order fields, etc. Record *data* (names, parts, notes)
  is never translated.

> Note: the template is per-browser and is not synced across devices.

### Word Export of the Work Order (Print View)

The browser print view (**/print**, "Work Order" template) gained an **"Export Word"**
button next to Print. It exports the same blank template as an editable `.docx`:
lined client/visit fields, grouped service & parts lists (each row with a Qty
blank and a "Client Paid" checkbox), a custom-items grid and a notes area.

## PDF Contents

## PDF Contents

### Company Report Includes:
- Company profile (name, tax ID, email, location)
- Key contacts with positions and phone numbers
- Machine ownership status
- Main office maintenance (if no branches)
- All branch details with:
  - Branch information
  - Assigned staff
  - Maintenance history
  - Parts replaced summary

### Branch Report Includes:
- Branch information
- Contact details
- Assigned staff with ratings and notes
- Detailed maintenance history
- Machine status
- Parts and services summary

## Technical Details

- Uses `jsPDF` library for PDF generation
- Professional table formatting with `jspdf-autotable`
- Automatic page breaks
- Page numbering
- Proper headers and footers
- Responsive column widths
- Flattens nested maintenance records (follow-ups)

## File Naming Convention

Files are automatically named:
- `CompanyName_Internal_Report_YYYY-MM-DD.pdf`
- `CompanyName_Client_Report_YYYY-MM-DD.pdf`
- `CompanyName_BranchName_Internal_Report_YYYY-MM-DD.pdf`
- `CompanyName_BranchName_Client_Report_YYYY-MM-DD.pdf`
