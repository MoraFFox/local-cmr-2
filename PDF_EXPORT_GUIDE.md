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
4. PDF will download automatically

For individual branches:
1. Expand a branch card
2. Click **"Print Branch"** dropdown
3. Choose report type
4. PDF downloads with branch-specific data

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
