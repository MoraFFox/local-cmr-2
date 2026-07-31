import { describe, it, expect } from "vitest";
import { reshapeArabic } from "../utils/arabicText";

// Expected outputs are VISUAL-ORDER strings: what jsPDF should store so an
// Arabic reader sees the correct text. The expected literals below are the
// shaped Arabic Presentation Forms exactly as the pipeline emits them.

describe("reshapeArabic — UAX #9 bidi reordering", () => {
  it("joins letters and keeps multi-word Arabic in correct word order", () => {
    // "تغيير جوانات" (change gaskets): both words shaped + reversed as ONE
    // span, so scanning RTL you read تغيير then جوانات.
    expect(reshapeArabic("تغيير جوانات", false)).toBe("ﺕﺎﻧﺍﻮﺟ ﺮﻴﻴﻐﺗ");
  });

  it("keeps the LTR run in order when Arabic is followed by a price", () => {
    // The user's original broken case. Visual line: EGP 400 — then the
    // reversed Arabic phrase. An Arabic reader sees: تغيير جوانات — 400 EGP.
    expect(reshapeArabic("تغيير جوانات — 400 EGP", false)).toBe(
      "EGP 400 — ﺕﺎﻧﺍﻮﺟ ﺮﻴﻴﻐﺗ",
    );
  });

  it("handles digits embedded between Arabic words (RTL layout)", () => {
    // "صفحة 1 من 5" (page 1 of 5) with forced RTL base direction, as used by
    // the Arabic missing-data PDFs.
    expect(reshapeArabic("صفحة 1 من 5", true)).toBe("5 ﻦﻣ 1 ﺔﺤﻔﺻ");
  });

  it("shapes Arabic embedded inside an English label", () => {
    // LTR base (auto-detected from the leading "Given:") — the Arabic run is
    // reversed as a whole span, the English prefix stays put.
    expect(reshapeArabic("Given: ماكينة مخصصة", false)).toBe(
      "Given: ﺔﺼﺼﺨﻣ ﺔﻨﻴﻛﺎﻣ",
    );
  });

  it("mirrors parentheses inside RTL runs", () => {
    expect(reshapeArabic("أولاد (علي)", false)).toBe("(ﻲﻠﻋ) ﺩﻻﻭﺃ");
    expect(reshapeArabic("منطقة (5)", false)).toBe("(5) ﺔﻘﻄﻨﻣ");
  });

  it("preserves the lam-alef ligature (non 1:1 shaping)", () => {
    const out = reshapeArabic("لا يوجد", false);
    // The folded lam-alef ligature U+FEFB survives the reordering, and the
    // phrase reads "لا يوجد" (the لا stays on the right side of the output).
    expect(out).toContain("\uFEFB");
    expect(out).toBe("ﺪﺟﻮﻳ \uFEFB");
  });

  it("leaves pure-LTR text untouched", () => {
    expect(reshapeArabic("Item", false)).toBe("Item");
    expect(reshapeArabic("250 EGP", false)).toBe("250 EGP");
    expect(reshapeArabic("Page 1 of 5", false)).toBe("Page 1 of 5");
    expect(reshapeArabic("Company Paid", true)).toBe("Company Paid");
  });

  it("is idempotent — already-shaped input is returned unchanged", () => {
    // pdfText() reshapes every draw call, and splitTextToSize(rtl(...)) lines
    // are already shaped; re-running bidi on them must not double-reverse.
    const once = reshapeArabic("تغيير جوانات — 400 EGP", false);
    const twice = reshapeArabic(once, false);
    expect(twice).toBe(once);
    // Same for the RTL-layout variant.
    const onceRtl = reshapeArabic("صفحة 1 من 5", true);
    expect(reshapeArabic(onceRtl, true)).toBe(onceRtl);
  });

  it("never emits raw isolated Arabic letters", () => {
    const out = reshapeArabic("تغيير جوانات", false);
    // Every Arabic letter must be a joined presentation form, not the raw
    // isolated codepoint.
    for (const ch of ["ت", "غ", "ي", "ر", "ج", "و", "ا", "ن"]) {
      expect(out).not.toContain(ch);
    }
  });
});
