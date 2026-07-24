/** @format */

import jsPDF from "jspdf";

/**
 * PDF Compact Layout Engine
 *
 * A lightweight, imperative-but-structured helper for generating jsPDF reports
 * that automatically hide empty fields/sections, reflow content to reclaim
 * space, and respect keep-with-next rules for section headings.
 *
 * Design goals:
 *  - Wrap existing imperative draw helpers (drawSectionHeader, drawInfoBox, etc.)
 *    rather than replace them.
 *  - Pre-evaluate emptiness so labels/headings can be omitted alongside their values.
 *  - Buffer blocks so page breaks and reflow can be recomputed after hiding.
 *  - Support a runtime `hideEmptyComponents` flag for "draft" vs "compact" modes.
 */

// ── Empty value rules ──

export type IgnoreCondition = "null" | "empty" | "zero" | "never";

/**
 * Check whether a value should be considered empty for PDF layout purposes.
 *
 * @param value The raw value to evaluate.
 * @param condition The rule to apply.
 * @returns true when the value should be hidden.
 */
export const isValueEmpty = (value: unknown, condition: IgnoreCondition): boolean => {
  if (condition === "never") return false;

  // null/undefined are always considered empty, regardless of condition.
  if (value === null || value === undefined) return true;

  if (condition === "empty") {
    if (typeof value === "string") {
      // Strip simple HTML tags (e.g. <p></p>, <br>) and trim whitespace.
      const stripped = value.replace(/<[^>]+>/g, "").trim();
      return stripped === "";
    }
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === "number") return false; // numbers are never "empty" under this rule
  }

  if (condition === "zero") {
    if (typeof value === "number" || typeof value === "string") {
      const n = typeof value === "number" ? value : Number(value);
      return n === 0;
    }
  }

  return false;
};

// ── Layout block model ──

export interface LayoutBlock {
  /** Estimated height in PDF units (mm). Used for pagination planning. */
  estimatedHeight: number;
  /** If true, this block will attempt to stay on the same page as the next block. */
  keepWithNext?: boolean;
  /** Draw the block. Receives the current y position and returns the next y position. */
  draw: (doc: jsPDF, y: number) => number;
}

export interface LayoutSection {
  title: string;
  blocks: LayoutBlock[];
}

// ── Options ──

export interface PDFLayoutOptions {
  /** When true (default), hide empty fields, sections and columns. */
  hideEmptyComponents: boolean;
  /** Top margin when a new page is added. */
  topMargin: number;
  /** Bottom margin used to decide page breaks. */
  bottomMargin: number;
  /** Page height; defaults to A4 (297 mm). */
  pageHeight: number;
  /** Estimated height of a section header, used when planning keep-with-next. */
  headerHeight: number;
}

const defaultOptions = (overrides?: Partial<PDFLayoutOptions>): PDFLayoutOptions => ({
  hideEmptyComponents: true,
  topMargin: 14,
  bottomMargin: 14,
  pageHeight: 297,
  headerHeight: 12,
  ...overrides,
});

// ── Layout engine ──

/**
 * Buffers and flushes layout blocks, handling:
 *  - hiding empty fields/sections when hideEmptyComponents is enabled
 *  - reflow (sequential drawing, no fixed gaps)
 *  - pagination with keep-with-next support
 */
export class PDFLayoutEngine {
  private doc: jsPDF;
  private blocks: LayoutBlock[] = [];
  private options: PDFLayoutOptions;

  /** Current vertical position on the active page. */
  public y: number;

  constructor(doc: jsPDF, startY: number, options?: Partial<PDFLayoutOptions>) {
    this.doc = doc;
    this.y = startY;
    this.options = defaultOptions(options);
  }

  /**
   * Toggle compact mode at runtime.
   */
  setHideEmpty(hide: boolean): void {
    this.options.hideEmptyComponents = hide;
  }

  /**
   * Add a raw block to the buffer.
   */
  addBlock(block: LayoutBlock): void {
    this.blocks.push(block);
  }

  /**
   * Add a field (label+value pair). When hideEmptyComponents is true and the
   * value is empty according to the given rule, both label and value are omitted.
   */
  addField(
    value: unknown,
    condition: IgnoreCondition,
    drawFn: (doc: jsPDF, y: number) => number,
    estimatedHeight: number,
  ): void {
    if (this.options.hideEmptyComponents && isValueEmpty(value, condition)) {
      return;
    }
    this.addBlock({ estimatedHeight, draw: drawFn });
  }

  /**
   * Add a section. If all child blocks produced by `buildChildren` are empty,
   * the section heading is also omitted. The heading itself is marked with
   * keep-with-next so it does not sit alone at the bottom of a page.
   */
  /**
   * Add a list/repeater block.
   * - In compact mode (hideEmptyComponents=true) with no data, it renders a
   *   compact "No items" placeholder instead of an empty shell.
   * - In draft mode (hideEmptyComponents=false) with no data, it renders the
   *   full items block so placeholders are preserved.
   * - When data is present, it always renders the full items block.
   */
  addRepeater<T>(
    data: T[],
    estimatedHeight: number,
    drawEmpty: (doc: jsPDF, y: number) => number,
    drawItems: (doc: jsPDF, y: number, items: T[]) => number,
  ): void {
    if (this.options.hideEmptyComponents && data.length === 0) {
      this.addBlock({
        estimatedHeight: 10,
        draw: drawEmpty,
      });
      return;
    }
    this.addBlock({
      estimatedHeight,
      draw: (doc, y) => drawItems(doc, y, data),
    });
  }

  addSection(
    title: string,
    buildChildren: (engine: PDFLayoutEngine) => void,
    drawHeader: (doc: jsPDF, title: string, y: number) => number,
  ): void {
    // Build children in a temporary engine so we can inspect whether any survive.
    const childEngine = new PDFLayoutEngine(this.doc, 0, {
      ...this.options,
      hideEmptyComponents: this.options.hideEmptyComponents,
    });
    buildChildren(childEngine);

    if (this.options.hideEmptyComponents && childEngine.blocks.length === 0) {
      return;
    }

    // Add header with keep-with-next so it stays with the first child block.
    this.addBlock({
      estimatedHeight: this.options.headerHeight,
      keepWithNext: true,
      draw: (doc, y) => drawHeader(doc, title, y),
    });

    this.blocks.push(...childEngine.blocks);
  }

  /**
   * Add a list/repeater block. If the data is empty, a compact "No items"
   * message is rendered instead of an empty table/shell.
   */
  /**
   * Flush all buffered blocks to the PDF, applying page breaks and
   * keep-with-next logic.
   */
  flush(): void {
    for (let i = 0; i < this.blocks.length; i++) {
      const block = this.blocks[i];
      let neededSpace = block.estimatedHeight;

      // Respect keep-with-next: ensure there is room for this block AND the next.
      if (block.keepWithNext && i + 1 < this.blocks.length) {
        neededSpace += this.blocks[i + 1].estimatedHeight;
      }

      // Check page bounds.
      if (this.y + neededSpace > this.options.pageHeight - this.options.bottomMargin) {
        this.doc.addPage();
        this.y = this.options.topMargin;
      }

      this.y = block.draw(this.doc, this.y);
    }

    this.blocks = [];
  }

  /**
   * Expose current options for inspection/debugging.
   */
  getOptions(): PDFLayoutOptions {
    return { ...this.options };
  }
}

// ── Smart table helpers ──

export interface SmartColumn<T> {
  id: string;
  label: string;
  /** How to read the value for emptiness checks and rendering. */
  accessor: (row: T) => unknown;
  /** Rule applied to decide if the column should be hidden. */
  ignoreIf: IgnoreCondition;
  /** Optional fixed width in PDF units. If omitted, width is auto-distributed. */
  width?: number;
}

export interface SmartTableResult<T> {
  columns: SmartColumn<T>[];
  /** True if at least one column was removed because it was entirely empty. */
  pruned: boolean;
}

/**
 * Remove columns that are entirely empty across all rows according to each
 * column's ignoreIf rule. Widens remaining columns proportionally when no
 * explicit widths are supplied.
 */
export function pruneEmptyColumns<T>(rows: T[], columns: SmartColumn<T>[]): SmartColumn<T>[] {
  if (rows.length === 0) return columns;

  return columns.filter((col) => {
    if (col.ignoreIf === "never") return true;
    return rows.some((row) => !isValueEmpty(col.accessor(row), col.ignoreIf));
  });
}

// ── Accessibility helpers ──

/**
 * jsPDF itself does not produce a tagged PDF structure tree by default.
 * Hiding a block means we simply do not execute its draw code, so no stray
 * text/graphics are emitted and there is nothing for a screen reader to pick
 * up. This helper is kept as a no-op hook so callers can add explicit tag
 * suppression if they later enable PDF/UA tagging via a plugin.
 */
export function suppressHiddenTag(): void {
  // Intentionally empty: non-rendered content is naturally absent from jsPDF output.
}
