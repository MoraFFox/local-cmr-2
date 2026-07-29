/** @format */

import ArabicReshaper from "arabic-persian-reshaper";

/** Detect if a character belongs to the Arabic script block. */
const isArabicChar = (char: string): boolean => {
  const code = char.charCodeAt(0);
  return code >= 0x0600 && code <= 0x06ff;
};

/**
 * Prepare Arabic text for jsPDF by applying shaping and RTL reversal.
 *
 * Handles mixed Arabic + English/numbers by processing each script run separately,
 * so English words are not reversed and Arabic words render correctly.
 *
 * @param text The text to reshape.
 * @param isRtlLayout When true, the overall run order is reversed so the text
 *   flows right-to-left (use for RTL documents rendered with jsPDF's `align: "right"`).
 *   When false, run order is preserved (use for LTR documents with embedded Arabic).
 */
export const reshapeArabic = (text: string, isRtlLayout = false): string => {
  try {
    // Split text into runs of Arabic vs non-Arabic characters
    const runs: { text: string; isArabic: boolean }[] = [];
    for (const char of text) {
      const isArabic = isArabicChar(char);
      if (runs.length > 0 && runs[runs.length - 1].isArabic === isArabic) {
        runs[runs.length - 1].text += char;
      } else {
        runs.push({ text: char, isArabic });
      }
    }

    // Process each run: reshape+reverse Arabic runs, keep non-Arabic runs intact
    const processedRuns = runs.map((run) => {
      if (run.isArabic) {
        return ArabicReshaper.convertArabic(run.text).split("").reverse().join("");
      }
      return run.text;
    });

    // Reverse the order of runs for RTL layout so the overall flow is RTL
    if (isRtlLayout) {
      processedRuns.reverse();
    }

    return processedRuns.join("");
  } catch {
    return text;
  }
};
