/** @format */

import { ArabicShaper } from "arabic-persian-reshaper";
import bidiFactory from "bidi-js";

// bidi-js ships an ESM build whose default export is a factory function; its
// named exports break under Vite's SSR/CJS interop (they come back undefined),
// so we call the factory once at module load and destructure from the result.
const bidi = bidiFactory();
const { getEmbeddingLevels, getReorderSegments, getMirroredCharacter } = bidi;

/** Detect if a character belongs to the Arabic script block (U+0600–U+06FF). */
const isArabicChar = (char: string): boolean => {
  const code = char.charCodeAt(0);
  return code >= 0x0600 && code <= 0x06ff;
};

const HAS_ARABIC = /[\u0600-\u06ff]/;

/**
 * Arabic Presentation Forms (A: U+FB50–U+FDFF, B: U+FE70–U+FEFC) mark text that
 * has already been shaped by us. pdfText() reshapes every draw call and the
 * lines produced by splitTextToSize(rtl(...)) are already shaped — running them
 * through bidi again would double-reverse the runs, so return them untouched.
 * Tradeoff: a string mixing shaped + raw Arabic is also returned as-is (the raw
 * tail would stay unshaped) — no current call site produces that, since every
 * template suffix is Latin/digits/parens.
 */
const ALREADY_SHAPED = /[\uFB50-\uFDFF\uFE70-\uFEFC]/;

const ARABIC_LETTER_RUN = /[\u0600-\u06ff]+/g;

/** Join Arabic letters into presentation forms, in LOGICAL order. */
const shapeArabicWords = (text: string): string =>
  text.replace(ARABIC_LETTER_RUN, (word) => ArabicShaper.convertArabic(word));

interface ShapedMap {
  /** The shaped string (Arabic words joined, brackets mirrored where RTL). */
  out: string;
  /**
   * For every logical index, the shaped offset where the unit (Arabic word or
   * single non-Arabic char) containing it starts.
   */
  startOff: number[];
  /** For every logical index, the shaped offset just past that unit. */
  endOff: number[];
}

/**
 * Join Arabic letters into presentation forms (logical order preserved) and,
 * for characters sitting in an RTL run, apply the bidi mirroring rule (L4) so
 * brackets/parens point the right way in the final visual order.
 *
 * Each shaped Arabic word is atomic (a single ligature can fold two letters,
 * e.g. lam-alef), which is why run reversal must operate on shaped offsets —
 * see applyReorder.
 */
const shapeAndMirror = (text: string, levels: Uint8Array): ShapedMap => {
  let out = "";
  const startOff: number[] = new Array(text.length);
  const endOff: number[] = new Array(text.length);
  let i = 0;
  while (i < text.length) {
    if (isArabicChar(text[i])) {
      const wordStart = i;
      while (i < text.length && isArabicChar(text[i])) i++;
      const wordShaped = ArabicShaper.convertArabic(text.slice(wordStart, i));
      for (let k = wordStart; k < i; k++) {
        startOff[k] = out.length;
        endOff[k] = out.length + wordShaped.length;
      }
      out += wordShaped;
    } else {
      let ch = text[i];
      if (levels[i] & 1) {
        const mirrored = getMirroredCharacter(ch);
        if (mirrored) ch = mirrored;
      }
      startOff[i] = out.length;
      endOff[i] = out.length + 1;
      out += ch;
      i++;
    }
  }
  return { out, startOff, endOff };
};

/**
 * Apply UAX #9 (Unicode Bidirectional Algorithm) reordering to the shaped
 * string. getReorderSegments returns the L2 reversal list — inner segments
 * first, then outer — and the nested reversal is exactly what keeps LTR runs
 * like "400 EGP" in the correct order inside an RTL paragraph.
 *
 * Shaping is not 1:1 (lam-alef folds to a single ligature codepoint), so each
 * segment's logical range is mapped to its shaped range first. Segment
 * boundaries always fall on non-Arabic characters, never inside a shaped
 * word, so the mapping is always exact.
 */
const applyReorder = (
  { out, startOff, endOff }: ShapedMap,
  segments: [number, number][],
): string => {
  if (segments.length === 0) return out;
  const chars = out.split("");
  for (const [s, e] of segments) {
    let a = startOff[s];
    let b = endOff[e] - 1;
    while (a < b) {
      const tmp = chars[a];
      chars[a] = chars[b];
      chars[b] = tmp;
      a++;
      b--;
    }
  }
  return chars.join("");
};

/**
 * Prepare Arabic text for jsPDF by applying letter shaping (joining) and the
 * Unicode Bidirectional Algorithm (UAX #9) so mixed Arabic + English + numbers
 * render with correct visual order and multi-word phrases keep their word
 * order.
 *
 * jsPDF draws strings left-to-right glyph by glyph and does no shaping or bidi
 * of its own, so this returns the string in visual order (Arabic runs shaped
 * and reversed as whole spans, including the spaces between words):
 *   "تغيير جوانات — 400 EGP" → "EGP 400 — ﺕﺎﻧﺍﻮﺟ ﺮﻴﻴﻐﺗ"
 *
 * @param text The text to reshape (raw, logical order).
 * @param isRtlLayout When true the paragraph base direction is forced RTL
 *   (Arabic documents rendered right-aligned, e.g. the missing-data PDFs).
 *   When false the base direction is auto-detected from the first strong
 *   character (English reports with embedded Arabic, e.g. the logistics PDFs).
 */
export const reshapeArabic = (text: string, isRtlLayout = false): string => {
  // Pure LTR text (no Arabic block chars) needs no shaping or reordering.
  if (!HAS_ARABIC.test(text)) return text;
  try {
    // Already-shaped input (e.g. lines from splitTextToSize(rtl(...)) fed back
    // through pdfText) must not be re-ordered — that would double-reverse it.
    if (ALREADY_SHAPED.test(text)) return text;
    const embeddingLevels = getEmbeddingLevels(text, isRtlLayout ? "rtl" : "auto");
    const segments = getReorderSegments(text, embeddingLevels);
    const shapedMap = shapeAndMirror(text, embeddingLevels.levels);
    return applyReorder(shapedMap, segments);
  } catch {
    // Safety net: keep letters joined (logical order) if bidi ever fails —
    // never fall back to raw isolated letters.
    return shapeArabicWords(text);
  }
};
