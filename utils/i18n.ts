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

/**
 * Localized name for a wizard step id (1..6, 4.5), used by the stepper,
 * the form progress bar, and page/document titles.
 */
export function wizardStepName(t: Translations, id: number): string {
  const key = id === 4.5 ? "step4_5" : `step${id}`;
  const name = (t.ui.wizard.steps as Record<string, string>)[key];
  return name ?? `Step ${id}`;
}

export type { Translations };
