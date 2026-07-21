import { ar } from "./arabicTranslations";

export { ar };

/**
 * Arabic-only translation hook. Returns the shared `ar` translation tree.
 * No `en` fallback — this app is Arabic-only by product decision.
 *
 * Usage:
 *   const t = useT();
 *   <span>{t.admin.sidebar.history}</span>
 */
export function useT() {
  return ar;
}

export type Translations = typeof ar;
