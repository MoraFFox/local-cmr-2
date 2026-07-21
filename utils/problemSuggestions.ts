/**
 * Problem Suggestions Engine
 *
 * Maps maintenance problems/issues to relevant services and parts so the
 * forms can surface context-aware suggestions at the top of the service/part
 * selectors. This makes the forms "smart and aware" — when a technician
 * reports a problem (e.g., "heater not heating"), the related services
 * (e.g., "تغيير heater") and parts (e.g., "هيتر") appear first.
 *
 * The mapping is based on the predefined problem values in `constants.ts`
 * (`problemCategories`) and the service/part options in `servicesList` /
 * `partsList`. Custom (free-text) problems are matched via keyword fallback.
 */

import { Service, Part } from '../types';
import { servicesList, partsList } from '../constants';

/**
 * Direct mapping from each predefined problem value to suggested service
 * values and part values. Values correspond to the `value` field in
 * `servicesList` / `partsList` and `problemCategories`.
 */
interface ProblemMapping {
  /** Service `value`s relevant to this problem */
  services: string[];
  /** Part `value`s relevant to this problem */
  parts: string[];
}

const PROBLEM_SUGGESTIONS: Record<string, ProblemMapping> = {
  // ── مشاكل عامة (General problems) ──
  'هاندات غير نظيفة': {
    services: ['تنظيف هاندات', 'دورة غسيل الجروبات (أول مرة)'],
    parts: [],
  },
  'تحتاج الى شاورات': {
    services: ['تغيير شاورات', 'تنظيف شاورات'],
    parts: ['شاور'],
  },
  'تحتاج الى جوانات': {
    services: ['تغيير جوانات'],
    parts: ['جوان', 'جوان لامرزوكو'],
  },
  'نسبة الملح عالية': {
    services: ['دورة غسيل سوفتنر بالملح'],
    parts: [],
  },

  // ── مشاكل ضغط وحرارة (Pressure & temperature problems) ──
  'ضغط الماكينة غير منضبط': {
    services: ['ضبط الضغط', 'تغيير حساس'],
    parts: ['حساس', 'بريشر'],
  },
  'درجة حرارة الماكينة منخفضة': {
    services: ['تغيير heater', 'ضبط الحراره'],
    parts: ['هيتر', 'حساس'],
  },
  'درجة حرارة الماكينة مرتفعة': {
    services: ['ضبط الحراره'],
    parts: ['حساس'],
  },

  // ── مشاكل التسريب (Leak problems) ──
  'تسريب مياة': {
    services: ['تغيير جوانات', 'تغيير طرمبة', 'تغيير ماسورة', 'تغيير حنفية مياة'],
    parts: ['جوان', 'طرمبه'],
  },
  'تسريب بخار': {
    services: ['تغيير هاند ستيم', 'تغيير جوانات'],
    parts: ['جوان'],
  },
  'مشاكل صرف': {
    services: ['تظيف الصرف'],
    parts: [],
  },
};

/**
 * Keyword-based fallback for custom (free-text) problems that don't match
 * any predefined value. Each keyword maps to suggested service/part values.
 * Matching is case-insensitive substring.
 */
const KEYWORD_FALLBACK: { keywords: string[]; mapping: ProblemMapping }[] = [
  {
    keywords: ['جوان', 'gasket', 'seal'],
    mapping: { services: ['تغيير جوانات'], parts: ['جوان', 'جوان لامرزوكو'] },
  },
  {
    keywords: ['شاور', 'shower', 'screen'],
    mapping: { services: ['تغيير شاورات', 'تنظيف شاورات'], parts: ['شاور'] },
  },
  {
    keywords: ['هيتر', 'heater', 'سخان'],
    mapping: { services: ['تغيير heater', 'ضبط الحراره'], parts: ['هيتر'] },
  },
  {
    keywords: ['منخفضة', 'low', 'cold'],
    mapping: { services: ['تغيير heater', 'ضبط الحراره'], parts: ['هيتر'] },
  },
  {
    keywords: ['مرتفعة', 'high', 'hot'],
    mapping: { services: ['ضبط الحراره'], parts: [] },
  },
  {
    keywords: ['طرمبه', 'pump', 'مضخة'],
    mapping: { services: ['تغيير طرمبة'], parts: ['طرمبه'] },
  },
  {
    keywords: ['حساس', 'sensor', 'ضغط', 'pressure'],
    mapping: { services: ['تغيير حساس', 'ضبط الضغط'], parts: ['حساس', 'بريشر'] },
  },
  {
    keywords: ['تسريب', 'leak', 'مياه', 'مياة', 'water'],
    mapping: { services: ['تغيير جوانات', 'تغيير ماسورة'], parts: ['جوان'] },
  },
  {
    keywords: ['بخار', 'steam', 'ستيم'],
    mapping: { services: ['تغيير هاند ستيم'], parts: ['جوان'] },
  },
  {
    keywords: ['صرف', 'drain'],
    mapping: { services: ['تظيف الصرف'], parts: [] },
  },
  {
    keywords: ['ملح', 'salt', 'سوفتنر'],
    mapping: { services: ['دورة غسيل سوفتنر بالملح'], parts: [] },
  },
  {
    keywords: ['هاندات', 'هاند', 'group', 'تنظيف', 'clean'],
    mapping: { services: ['تنظيف هاندات', 'دورة غسيل الجروبات (أول مرة)'], parts: [] },
  },
  {
    keywords: ['طحن', 'grind', 'مطحنه', 'مطحنة'],
    mapping: { services: ['ضبط الطحنة'], parts: ['زور مطحنه', 'تروس مطحنة'] },
  },
  {
    keywords: ['measure', 'معايره', 'معايرة'],
    mapping: { services: ['تظبيط measure'], parts: [] },
  },
  {
    keywords: ['زرار', 'button', 'زر'],
    mapping: { services: ['تغيير زرار ماكينة', 'تغيير زرار مطحنة'], parts: ['زرار مطحنة', 'زرار ماكينه عادى', 'زرار ماكينه بريميوم'] },
  },
  {
    keywords: ['صنولويد', 'solenoid', 'محبس'],
    mapping: { services: ['تغيير محبس'], parts: ['صنولويد'] },
  },
  {
    keywords: ['عداد', 'meter', 'counter'],
    mapping: { services: ['تغيير عداد'], parts: [] },
  },
  {
    keywords: ['حنفية', 'فال', 'valve'],
    mapping: { services: ['تغيير حنفية مياة'], parts: [] },
  },
  {
    keywords: ['ماسورة', 'pipe', 'tube'],
    mapping: { services: ['تغيير ماسورة'], parts: [] },
  },
  {
    keywords: ['كابستور', 'capacitor'],
    mapping: { services: [], parts: ['كابستور'] },
  },
];

/**
 * Resolve a single problem to its suggested service/part values, combining
 * the direct mapping (if predefined) with keyword fallback (for custom text).
 */
function resolveProblem(problem: string): ProblemMapping {
  const services = new Set<string>();
  const parts = new Set<string>();

  // 1. Direct predefined mapping
  const direct = PROBLEM_SUGGESTIONS[problem];
  if (direct) {
    direct.services.forEach((s) => services.add(s));
    direct.parts.forEach((p) => parts.add(p));
  }

  // 2. Keyword fallback (also runs for predefined problems to catch
  //    additional associations, and is the only source for custom text)
  const lower = problem.toLowerCase();
  KEYWORD_FALLBACK.forEach(({ keywords, mapping }) => {
    if (keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      mapping.services.forEach((s) => services.add(s));
      mapping.parts.forEach((p) => parts.add(p));
    }
  });

  return { services: Array.from(services), parts: Array.from(parts) };
}

interface SuggestionScore {
  /** How many problems suggested this value */
  score: number;
  /** Index of the first problem that suggested this value (for stable tie-breaking) */
  firstIndex: number;
}

/**
 * Remove duplicate problem values and trim whitespace so each unique problem
 * contributes only once to the combined score.
 */
function normalizeProblems(problems: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  problems.forEach((problem) => {
    const trimmed = problem.trim();
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      normalized.push(trimmed);
    }
  });
  return normalized;
}

/**
 * Score each suggested value by how many problems mention it.
 *
 * @returns A Map from value to its score and the index of the first problem
 *          that suggested it.
 */
function scoreValues(valuesPerProblem: string[][]): Map<string, SuggestionScore> {
  const scores = new Map<string, SuggestionScore>();

  valuesPerProblem.forEach((values, problemIndex) => {
    // Deduplicate within a single problem so a value only gets one "point"
    // per problem, even if multiple keywords or mappings mention it.
    const uniqueValues = Array.from(new Set(values));
    uniqueValues.forEach((value) => {
      const existing = scores.get(value);
      if (existing) {
        scores.set(value, { ...existing, score: existing.score + 1 });
      } else {
        scores.set(value, { score: 1, firstIndex: problemIndex });
      }
    });
  });

  return scores;
}

/**
 * Get suggested services for a list of problems.
 *
 * Returns `Service` objects (from `servicesList`) that are relevant to the
 * given problems, in suggestion order (most-relevant first). Services that
 * are suggested by multiple problems are ranked higher. Services not
 * present in `servicesList` are silently skipped (e.g., if a custom
 * problem maps to a service value that doesn't exist).
 *
 * @param problems Array of problem values (predefined or custom free-text)
 * @returns Service[] suggested services, deduplicated, in relevance order
 */
export function getSuggestedServices(problems: string[]): Service[] {
  if (!problems || problems.length === 0) return [];

  const uniqueProblems = normalizeProblems(problems);
  const serviceValuesPerProblem = uniqueProblems.map((problem) => resolveProblem(problem).services);
  const scores = scoreValues(serviceValuesPerProblem);

  const serviceMap = new Map(servicesList.map((s) => [s.value, s]));

  return Array.from(scores.entries())
    .filter(([value]) => serviceMap.has(value))
    .sort((a, b) => {
      // Higher score first; on ties, keep the first problem order
      if (b[1].score !== a[1].score) return b[1].score - a[1].score;
      return a[1].firstIndex - b[1].firstIndex;
    })
    .map(([value]) => serviceMap.get(value)!);
}

/**
 * Get suggested parts for a list of problems.
 *
 * Returns `Part` objects (from `partsList`) that are relevant to the given
 * problems, in suggestion order. Parts that are suggested by multiple
 * problems are ranked higher. Parts not in `partsList` are skipped.
 *
 * @param problems Array of problem values (predefined or custom free-text)
 * @returns Part[] suggested parts, deduplicated, in relevance order
 */
export function getSuggestedParts(problems: string[]): Part[] {
  if (!problems || problems.length === 0) return [];

  const uniqueProblems = normalizeProblems(problems);
  const partValuesPerProblem = uniqueProblems.map((problem) => resolveProblem(problem).parts);
  const scores = scoreValues(partValuesPerProblem);

  const partMap = new Map(partsList.map((p) => [p.value, p]));

  return Array.from(scores.entries())
    .filter(([value]) => partMap.has(value))
    .sort((a, b) => {
      if (b[1].score !== a[1].score) return b[1].score - a[1].score;
      return a[1].firstIndex - b[1].firstIndex;
    })
    .map(([value]) => partMap.get(value)!);
}

/**
 * Check whether any suggestions exist for the given problems.
 * Useful for conditionally rendering the "Suggested" section header.
 */
export function hasSuggestions(problems: string[]): boolean {
  if (!problems || problems.length === 0) return false;

  const uniqueProblems = normalizeProblems(problems);
  const serviceSet = new Set(servicesList.map((s) => s.value));
  const partSet = new Set(partsList.map((p) => p.value));

  return uniqueProblems.some((problem) => {
    const { services, parts } = resolveProblem(problem);
    return (
      services.some((value) => serviceSet.has(value)) ||
      parts.some((value) => partSet.has(value))
    );
  });
}
