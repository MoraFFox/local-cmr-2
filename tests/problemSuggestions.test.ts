import { describe, it, expect } from 'vitest';
import { getSuggestedServices, getSuggestedParts, hasSuggestions } from '../utils/problemSuggestions';

describe('problemSuggestions', () => {
  describe('getSuggestedServices', () => {
    it('returns empty array for empty or nullish problems', () => {
      expect(getSuggestedServices([])).toEqual([]);
      expect(getSuggestedServices(undefined as any)).toEqual([]);
      expect(getSuggestedServices(null as any)).toEqual([]);
    });

    it('returns suggested services for a direct predefined problem', () => {
      const result = getSuggestedServices(['تسريب مياة']);
      const values = result.map((s) => s.value);

      expect(values).toContain('تغيير جوانات');
      expect(values).toContain('تغيير طرمبة');
      expect(values).toContain('تغيير ماسورة');
      expect(values).toContain('تغيير حنفية مياة');
    });

    it('returns suggested services for keyword fallback on custom text', () => {
      const result = getSuggestedServices(['هناك تسريب مياه في الماكينة']);
      const values = result.map((s) => s.value);

      expect(values).toContain('تغيير جوانات');
      expect(values).toContain('تغيير ماسورة');
    });

    it('matches multiple keyword fallbacks in a single custom problem', () => {
      const result = getSuggestedServices(['water leak and broken pump']);
      const values = result.map((s) => s.value);

      expect(values).toContain('تغيير جوانات');
      expect(values).toContain('تغيير ماسورة');
      expect(values).toContain('تغيير طرمبة');
    });

    it('is case-insensitive for keyword matching', () => {
      const lower = getSuggestedServices(['water leak']).map((s) => s.value);
      const upper = getSuggestedServices(['WATER LEAK']).map((s) => s.value);
      const mixed = getSuggestedServices(['WaTeR LeAk']).map((s) => s.value);

      expect(lower.length).toBeGreaterThan(0);
      expect(lower).toEqual(upper);
      expect(lower).toEqual(mixed);
    });

    it('deduplicates services suggested by multiple problems', () => {
      const result = getSuggestedServices(['تسريب مياة', 'تسريب بخار']);
      const values = result.map((s) => s.value);
      const changeGasketCount = values.filter((v) => v === 'تغيير جوانات').length;

      expect(changeGasketCount).toBe(1);
    });

    it('preserves suggestion order based on problem order', () => {
      const result = getSuggestedServices(['تحتاج الى جوانات', 'تحتاج الى شاورات']);
      const values = result.map((s) => s.value);

      expect(values.indexOf('تغيير جوانات')).toBeLessThan(values.indexOf('تغيير شاورات'));
    });

    it('ranks services higher when suggested by multiple problems', () => {
      // Both water leak and steam leak suggest "تغيير جوانات"; only water
      // leak suggests the others. "تغيير جوانات" should appear first.
      const result = getSuggestedServices(['تسريب مياة', 'تسريب بخار']).map((s) => s.value);

      expect(result[0]).toBe('تغيير جوانات');
    });

    it('breaks score ties by first problem order', () => {
      // "تغيير جوانات" is suggested by both water and steam leaks, so it
      // should rank first. The remaining score-1 services should be ordered by
      // the problem that introduced them.
      const result = getSuggestedServices(['تسريب مياة', 'تسريب بخار', 'تحتاج الى شاورات']).map((s) => s.value);

      expect(result.indexOf('تغيير جوانات')).toBe(0);
      expect(result.indexOf('تغيير طرمبة')).toBeLessThan(result.indexOf('تغيير هاند ستيم'));
      expect(result.indexOf('تغيير هاند ستيم')).toBeLessThan(result.indexOf('تغيير شاورات'));
    });

    it('does not double-count duplicate problem values', () => {
      const result = getSuggestedServices(['تسريب مياة', 'تسريب مياة', 'تسريب مياة']).map((s) => s.value);

      // If duplicates were counted three times, "تغيير جوانات" would still be
      // first; this test mainly asserts there is only one instance of each
      // service and no errors. A service unique to one problem should still
      // appear exactly once.
      const uniqueValues = Array.from(new Set(result));
      expect(uniqueValues).toEqual(result);
      expect(result).toContain('تغيير طرمبة');
    });

    it('boosts services that are suggested by both predefined and custom problems', () => {
      // "تغيير جوانات" is suggested by both the predefined "تسريب مياة" and
      // the custom text "water leak gasket".
      const result = getSuggestedServices(['تسريب مياة', 'water leak gasket']).map((s) => s.value);

      expect(result[0]).toBe('تغيير جوانات');
      expect(result).toContain('تغيير طرمبة');
    });

    it('returns only services that exist in servicesList', () => {
      const result = getSuggestedServices(['هاندات غير نظيفة']);

      result.forEach((service) => {
        expect(service.label).toBeDefined();
        expect(service.value).toBeDefined();
        expect(service.category).toBeDefined();
      });
    });

    it('suggests heater replacement for low temperature only', () => {
      const lowTemp = getSuggestedServices(['درجة حرارة الماكينة منخفضة']).map((s) => s.value);
      const highTemp = getSuggestedServices(['درجة حرارة الماكينة مرتفعة']).map((s) => s.value);

      expect(lowTemp).toContain('تغيير heater');
      expect(highTemp).not.toContain('تغيير heater');
      expect(highTemp).toContain('ضبط الحراره');
    });

    it('uses keyword fallback for low/high temperature custom text', () => {
      const low = getSuggestedServices(['حرارة منخفضة']).map((s) => s.value);
      const high = getSuggestedServices(['حرارة مرتفعة']).map((s) => s.value);

      expect(low).toContain('تغيير heater');
      expect(high).not.toContain('تغيير heater');
      expect(high).toContain('ضبط الحراره');
    });
  });

  describe('getSuggestedParts', () => {
    it('returns empty array for empty or nullish problems', () => {
      expect(getSuggestedParts([])).toEqual([]);
      expect(getSuggestedParts(undefined as any)).toEqual([]);
      expect(getSuggestedParts(null as any)).toEqual([]);
    });

    it('returns suggested parts for a direct predefined problem', () => {
      const result = getSuggestedParts(['تحتاج الى شاورات']);
      const values = result.map((p) => p.value);

      expect(values).toContain('شاور');
    });

    it('returns suggested parts for keyword fallback on custom text', () => {
      const result = getSuggestedParts(['الماكينة تحتاج الى جوانات جديدة']);
      const values = result.map((p) => p.value);

      expect(values).toContain('جوان');
      expect(values).toContain('جوان لامرزوكو');
    });

    it('deduplicates parts suggested by multiple problems', () => {
      const result = getSuggestedParts(['تسريب مياة', 'تسريب بخار']);
      const values = result.map((p) => p.value);
      const gasketCount = values.filter((v) => v === 'جوان').length;

      expect(gasketCount).toBe(1);
    });

    it('preserves suggestion order based on problem order', () => {
      const result = getSuggestedParts(['تحتاج الى جوانات', 'تحتاج الى شاورات']);
      const values = result.map((p) => p.value);

      expect(values.indexOf('جوان')).toBeLessThan(values.indexOf('شاور'));
    });

    it('ranks parts higher when suggested by multiple problems', () => {
      // Both water leak and steam leak suggest "جوان"; only water leak
      // suggests "طرمبه".
      const result = getSuggestedParts(['تسريب مياة', 'تسريب بخار']).map((p) => p.value);

      expect(result[0]).toBe('جوان');
      expect(result).toContain('طرمبه');
    });

    it('returns only parts that exist in partsList', () => {
      const result = getSuggestedParts(['تحتاج الى شاورات']);

      result.forEach((part) => {
        expect(part.label).toBeDefined();
        expect(part.value).toBeDefined();
        expect(part.cost).toBeDefined();
      });
    });

    it('suggests heater part for low temperature only', () => {
      const lowTemp = getSuggestedParts(['درجة حرارة الماكينة منخفضة']).map((p) => p.value);
      const highTemp = getSuggestedParts(['درجة حرارة الماكينة مرتفعة']).map((p) => p.value);

      expect(lowTemp).toContain('هيتر');
      expect(highTemp).not.toContain('هيتر');
    });

    it('uses keyword fallback for low/high temperature custom text', () => {
      const low = getSuggestedParts(['low temperature']).map((p) => p.value);
      const high = getSuggestedParts(['high temperature']).map((p) => p.value);

      expect(low).toContain('هيتر');
      expect(high).not.toContain('هيتر');
    });
  });

  describe('hasSuggestions', () => {
    it('returns false for empty problems', () => {
      expect(hasSuggestions([])).toBe(false);
      expect(hasSuggestions(undefined as any)).toBe(false);
    });

    it('returns true when a problem has service suggestions', () => {
      expect(hasSuggestions(['هاندات غير نظيفة'])).toBe(true);
    });

    it('returns true when a problem has part suggestions', () => {
      expect(hasSuggestions(['تحتاج الى شاورات'])).toBe(true);
    });

    it('returns false for a problem with no suggestions', () => {
      expect(hasSuggestions(['problem with no mapping or keywords'])).toBe(false);
    });
  });
});
