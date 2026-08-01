import { describe, it, expect } from 'vitest';
import {
  composeMaintenanceWork,
  composeMaintenanceWorkEn,
  getMaintenanceWorkSections,
  formatWorkItemWithCost,
  formatMachineDescription,
  formatMachineDescriptionAr,
  resolveLogisticsWorkItemCost,
  getLogisticsWorkItemDisplay,
} from '../utils/logisticsLabels';

describe('logistics work item display', () => {
  it('prefers saved costs, falls back to the catalog, and calculates totals', () => {
    expect(resolveLogisticsWorkItemCost('جوان', undefined, 'part')).toBe(100);
    expect(resolveLogisticsWorkItemCost('جوان', 125, 'part')).toBe(125);
    expect(getLogisticsWorkItemDisplay('جوان', 3, undefined, 'part')).toEqual({
      name: 'جوان',
      count: 3,
      unitCost: 100,
      totalCost: 300,
    });
  });

  it('keeps explicit zero costs and leaves unknown custom items unpriced', () => {
    expect(getLogisticsWorkItemDisplay('Custom part', 2, 0, 'part')).toEqual({
      name: 'Custom part',
      count: 2,
      unitCost: 0,
      totalCost: 0,
    });
    expect(getLogisticsWorkItemDisplay('Custom part', 2, undefined, 'part')).toEqual({
      name: 'Custom part',
      count: 2,
      unitCost: undefined,
      totalCost: undefined,
    });
  });
});

describe('composeMaintenanceWork', () => {
  it('composes issues, services and parts into one summary', () => {
    const summary = composeMaintenanceWork(
      ['هاندات غير نظيفة', 'تسريب مياة'],
      [{ name: 'تغيير جوانات', count: 1 }],
      [{ name: 'جوان', count: 2 }],
    );
    expect(summary).toBe('المشاكل: هاندات غير نظيفة، تسريب مياة | الخدمات: تغيير جوانات | القطع: جوان ×2');
  });

  it('omits empty sections', () => {
    const onlyParts = composeMaintenanceWork([], [], [{ name: 'شاور', count: 1 }]);
    expect(onlyParts).toBe('القطع: شاور');

    const onlyIssues = composeMaintenanceWork(['تحتاج الى جوانات']);
    expect(onlyIssues).toBe('المشاكل: تحتاج الى جوانات');

    expect(composeMaintenanceWork()).toBe('');
  });

  it('adds ×count only when count > 1', () => {
    const summary = composeMaintenanceWork(
      [],
      [
        { name: 'ضبط الطحنة', count: 1 },
        { name: 'دورة غسيل', count: 3 },
      ],
    );
    expect(summary).toBe('الخدمات: ضبط الطحنة، دورة غسيل ×3');
  });
});

describe('getMaintenanceWorkSections', () => {
  it('splits work into labeled sections with pre-formatted items', () => {
    const sections = getMaintenanceWorkSections(
      ['هاندات غير نظيفة'],
      [{ name: 'تغيير جوانات', count: 2 }],
      [{ name: 'جوان', count: 1 }],
    );
    expect(sections).toEqual([
      { key: 'issues', items: ['هاندات غير نظيفة'] },
      { key: 'services', items: ['تغيير جوانات ×2'] },
      { key: 'parts', items: ['جوان'] },
    ]);
  });

  it('omits empty sections and returns [] when nothing was done', () => {
    expect(getMaintenanceWorkSections()).toEqual([]);
    expect(getMaintenanceWorkSections([], [], [{ name: 'شاور', count: 1 }])).toEqual([
      { key: 'parts', items: ['شاور'] },
    ]);
  });
});

describe('formatWorkItemWithCost', () => {
  it('formats a single item with its unit cost', () => {
    expect(formatWorkItemWithCost('جوان', 1, 100)).toBe('جوان — 100 ج.م');
  });

  it('breaks down unit × count = total for multi-quantity items', () => {
    expect(formatWorkItemWithCost('جوان', 2, 100)).toBe('جوان ×2 — 100 ج.م × 2 = 200 ج.م');
  });

  it('omits the cost when it is unknown or missing', () => {
    expect(formatWorkItemWithCost('جوان', 1)).toBe('جوان');
    expect(formatWorkItemWithCost('جوان', 3, null)).toBe('جوان ×3');
  });

  it('uses the given currency suffix for English reports', () => {
    expect(formatWorkItemWithCost('Gasket', 1, 100, 'EGP')).toBe('Gasket — 100 EGP');
    expect(formatWorkItemWithCost('Gasket', 2, 100, 'EGP')).toBe('Gasket ×2 — 100 EGP × 2 = 200 EGP');
  });
});

describe('composeMaintenanceWorkEn', () => {
  it('builds structured multi-line text with English labels and bullets', () => {
    const text = composeMaintenanceWorkEn(
      ['هاندات غير نظيفة', 'تسريب مياة'],
      [{ name: 'تغيير جوانات', count: 1 }],
    );
    expect(text).toBe(
      'Issues:\n  • هاندات غير نظيفة\n  • تسريب مياة\n\nServices:\n  • تغيير جوانات',
    );
  });

  it('returns empty string when nothing was done', () => {
    expect(composeMaintenanceWorkEn()).toBe('');
  });
});

describe('formatMachineDescription', () => {
  it('combines category and system with · separator', () => {
    expect(formatMachineDescription('coffee', 'automatic')).toBe('Coffee Machine · Automatic');
  });

  it('handles custom/unknown values by falling back to raw text', () => {
    expect(formatMachineDescription('La Marzocco', undefined)).toBe('La Marzocco');
  });

  it('returns empty string when nothing is provided', () => {
    expect(formatMachineDescription()).toBe('');
  });

  it('prepends the machine name when provided', () => {
    expect(formatMachineDescription('coffee', 'automatic', 'La Marzocco Linea')).toBe(
      'La Marzocco Linea · Coffee Machine · Automatic',
    );
  });

  it('ignores a blank machine name', () => {
    expect(formatMachineDescription('grinder', undefined, '   ')).toBe('Grinder');
  });

  it('maps the custom type to "Custom"', () => {
    expect(formatMachineDescription('other')).toBe('Custom');
  });
});

describe('formatMachineDescriptionAr', () => {
  it('combines Arabic category and system labels', () => {
    expect(formatMachineDescriptionAr('grinder', 'semi_automatic')).toBe('مطحنة · نصف أوتوماتيك');
  });

  it('maps the custom type to "مخصص"', () => {
    expect(formatMachineDescriptionAr('other')).toBe('مخصص');
  });

  it('prepends the machine name when provided', () => {
    expect(formatMachineDescriptionAr('coffee', 'manual', 'Mazzer Super Jolly')).toBe(
      'Mazzer Super Jolly · ماكينة قهوة · يدوي',
    );
  });
});
