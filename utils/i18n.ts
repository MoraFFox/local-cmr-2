import { useLanguage } from "./LanguageContext";
import type { Translations } from "./arabicTranslations";

/**
 * Translation hook that returns the translations for the current language.
 * Uses the LanguageContext to get the active language.
 */
export function useT() {
  const { t } = useLanguage();
  return t;
}

export type { Translations };
