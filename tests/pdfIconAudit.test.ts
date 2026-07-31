import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import jsPDF from "jspdf";
import { drawPdfIcon, drawIconBadge, FA_FONT_NAME, PdfIconName } from "../utils/pdfTheme";

// Every icon the library can draw. This list is intentionally exhaustive:
// the compile-time check below fails CI if a new PdfIconName is added to the
// union without also being added here (and by extension to the switch in
// drawPdfIcon, which is itself guarded by an exhaustive default case).
const ALL_ICONS = [
  "phone",
  "mail",
  "location",
  "calendar",
  "money",
  "wrench",
  "cog",
  "package",
  "alert",
  "user",
  "truck",
  "coffee",
  "star",
  "check",
  "cross",
  "doc",
  "chart",
  "home",
  "clock",
] as const;

// Type-only compile guard: if a new PdfIconName is added to the union without
// also being added to ALL_ICONS, the conditional resolves to `false` and
// `_Assert<false>` fails the `T extends true` constraint (tsc error). Note:
// this must be `false`, NOT `never` — `never extends true` is true in TS, so
// a `never` branch would silently pass. No runtime/unused-variable cost.
type _Assert<T extends true> = T;
type _CoverageCheck = _Assert<
  [PdfIconName] extends [typeof ALL_ICONS[number]] ? true : false
>;

// The badge radii actually used across the reports (section headers 2.1,
// KPI cards 2.6, machine cards 2.5, contacts 2.2, logistics cards 2.4,
// info rows 2.0, table cells 1.8/1.7, details band 1.5).
const PRODUCTION_RADII = [1.5, 1.7, 1.8, 2.0, 2.1, 2.2, 2.4, 2.5, 2.6, 3.5];

// A blank jsPDF already emits ~1.5KB (page objects), so asserting an absolute
// size would be vacuous. Instead we compare against a blank baseline — the
// icon-bearing document must be meaningfully larger, proving real drawing.
const blankBaseline = new jsPDF().output("arraybuffer").byteLength;

/**
 * Register the Font Awesome Solid font (public/fonts/fa-solid-900.ttf) on a
 * fresh doc, exactly like loadFonts does in the browser. Without this the
 * icons degrade to the fallback dot and the glyph-drawing path never runs.
 */
const registerIconFont = (): jsPDF => {
  const doc = new jsPDF();
  const abs = path.join(process.cwd(), "public", "fonts", "fa-solid-900.ttf");
  const b64 = fs.readFileSync(abs).toString("base64");
  doc.addFileToVFS("fa-solid-900.ttf", b64);
  doc.addFont("fa-solid-900.ttf", FA_FONT_NAME, "normal");
  return doc;
};

describe("PDF icon library audit", () => {
  it("draws every PdfIconName directly without throwing (multiple sizes)", () => {
    const doc = registerIconFont();
    for (const icon of ALL_ICONS) {
      for (const size of [2, 3.5, 6]) {
        drawPdfIcon(doc, icon, 20, 20, size);
      }
    }
    // No exception above means every jsPDF API call in the icon library is
    // valid (this is what caught the doc.lines scale-array crash).
    const out = doc.output("arraybuffer");
    expect(out.byteLength).toBeGreaterThan(blankBaseline + 1000);
  });

  it("draws every icon inside a badge at the radii the reports use", () => {
    const doc = registerIconFont();
    for (const radius of PRODUCTION_RADII) {
      for (const icon of ALL_ICONS) {
        drawIconBadge(doc, 20, 20, icon, [180, 30, 40], radius);
      }
    }
    const out = doc.output("arraybuffer");
    expect(out.byteLength).toBeGreaterThan(blankBaseline + 1000);
  });
});
