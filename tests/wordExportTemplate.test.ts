import { describe, it, expect, beforeEach } from "vitest";
import {
  loadWordTemplate,
  saveWordTemplate,
  clearWordTemplate,
  WORD_TEMPLATE_STORAGE_KEY,
  WordTemplateConfig,
} from "../utils/wordExportTemplate";

describe("Word export template persistence", () => {
  beforeEach(() => clearWordTemplate());

  it("returns an empty template when nothing is stored", () => {
    expect(loadWordTemplate()).toEqual({});
  });

  it("round-trips a full template through localStorage", () => {
    const config: WordTemplateConfig = {
      logoDataUrl: "data:image/png;base64,AAAA",
      footerText: "Custom footer",
      labelLang: "ar",
    };
    saveWordTemplate(config);
    expect(loadWordTemplate()).toEqual(config);
    expect(window.localStorage.getItem(WORD_TEMPLATE_STORAGE_KEY)).toBeTruthy();
  });

  it("normalizes an unknown label language back to undefined (English default)", () => {
    window.localStorage.setItem(WORD_TEMPLATE_STORAGE_KEY, JSON.stringify({ labelLang: "fr" }));
    expect(loadWordTemplate().labelLang).toBeUndefined();
  });

  it("drops non-string logo/footer values", () => {
    window.localStorage.setItem(WORD_TEMPLATE_STORAGE_KEY, JSON.stringify({ logoDataUrl: 123, footerText: null }));
    const loaded = loadWordTemplate();
    expect(loaded.logoDataUrl).toBeNull();
    expect(loaded.footerText).toBeNull();
  });

  it("clears the stored template", () => {
    saveWordTemplate({ footerText: "x" });
    clearWordTemplate();
    expect(loadWordTemplate()).toEqual({});
  });

  it("handles corrupted JSON gracefully", () => {
    window.localStorage.setItem(WORD_TEMPLATE_STORAGE_KEY, "{not json");
    expect(loadWordTemplate()).toEqual({});
  });
});
