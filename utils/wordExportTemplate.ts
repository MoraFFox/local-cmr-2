/**
 * Word export template configuration — persisted in localStorage so both the
 * settings UI and the (lazy-loaded) Word export module can read it without
 * pulling the `docx` library into the settings chunk.
 */
export type WordLabelLang = "ar" | "en";

export interface WordTemplateConfig {
  /** Base64 PNG/JPEG data URL shown at the top of every Word export. */
  logoDataUrl?: string | null;
  /** Custom footer text; null/undefined = no footer for internal/cost reports
   * (the old default "CONFIDENTIAL…" line was removed) and the "Service
   * Report" label for client reports. */
  footerText?: string | null;
  /** Label language for the report structure labels; defaults to "en". */
  labelLang?: WordLabelLang;
}

export const WORD_TEMPLATE_STORAGE_KEY = "cmr-word-template";

export const loadWordTemplate = (): WordTemplateConfig => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(WORD_TEMPLATE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<WordTemplateConfig>;
    return {
      logoDataUrl: typeof parsed.logoDataUrl === "string" ? parsed.logoDataUrl : null,
      footerText: typeof parsed.footerText === "string" ? parsed.footerText : null,
      labelLang: parsed.labelLang === "ar" ? "ar" : parsed.labelLang === "en" ? "en" : undefined,
    };
  } catch {
    // localStorage may throw in private browsing / storage-full environments
    return {};
  }
};

/** Persist the template. Returns false when storage is unavailable/full. */
export const saveWordTemplate = (config: WordTemplateConfig): boolean => {
  try {
    window.localStorage.setItem(WORD_TEMPLATE_STORAGE_KEY, JSON.stringify(config));
    return true;
  } catch {
    return false;
  }
};

export const clearWordTemplate = (): void => {
  try {
    window.localStorage.removeItem(WORD_TEMPLATE_STORAGE_KEY);
  } catch {
    // ignore
  }
};
