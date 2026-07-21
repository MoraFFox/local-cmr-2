import { describe, it, expect } from 'vitest';
import { generateMockMaintenanceRecord } from '../utils/mockData';
import { MaintenanceRecord } from '../types';
import { partsList, servicesList, problemCategories } from '../constants';

const isISODate = (value: string | undefined): boolean => {
  if (!value) return false;
  const date = new Date(value);
  return !isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(value);
};

describe('generateMockMaintenanceRecord', () => {
  it('returns a MaintenanceRecord with all required fields', () => {
    const record = generateMockMaintenanceRecord('record-1');

    expect(record).toBeDefined();
    expect(record.id).toBe('record-1');
    expect(record.maintenanceDate).toBeDefined();
    expect(record.type).toMatch(/^(scheduled|requested)$/);
    expect(record.hadProblem).toBeTypeOf('boolean');
    expect(record.partsWereReplaced).toBeTypeOf('boolean');
    expect(record.problemSolved).toBeTypeOf('boolean');
    expect(record.partsReplaced).toBeInstanceOf(Array);
    expect(record.servicesPerformed).toBeInstanceOf(Array);
    expect(record.supervisors).toBeInstanceOf(Array);
    expect(record.machines).toBeInstanceOf(Array);
    expect(record.problems).toBeInstanceOf(Array);
    expect(record.followUpVisits).toBeInstanceOf(Array);
    expect(record.photos).toBeInstanceOf(Array);
  });

  it('preserves the provided id', () => {
    expect(generateMockMaintenanceRecord(123).id).toBe(123);
    expect(generateMockMaintenanceRecord('abc').id).toBe('abc');
  });

  it('uses supplied parts and services to build realistic arrays', () => {
    const customParts = [
      { label: 'Custom Part A', value: 'custom-part-a', cost: 100 },
      { label: 'Custom Part B', value: 'custom-part-b', cost: 200 },
    ];
    const customServices = [
      { label: 'Custom Service A', value: 'custom-service-a', cost: 300 },
      { label: 'Custom Service B', value: 'custom-service-b', cost: 400 },
    ];

    const record = generateMockMaintenanceRecord('test', {
      partsList: customParts,
      servicesList: customServices,
    });

    expect(record.servicesPerformed.length).toBeGreaterThan(0);
    record.servicesPerformed.forEach((s) => {
      expect(customServices.some((cs) => cs.value === s.name)).toBe(true);
      expect(s.count).toBeGreaterThan(0);
      expect(s.cost).toBeDefined();
    });
  });

  it('selects barista and client barista names from available options when provided', () => {
    const availableBaristas = [{ name: 'Tech One' }, { name: 'Tech Two' }];
    const availableClientBaristas = [{ name: 'Client One' }, { name: 'Client Two' }];

    const record = generateMockMaintenanceRecord('test', {
      availableBaristas,
      availableClientBaristas,
    });

    expect(availableBaristas.some((b) => b.name === record.baristaName)).toBe(true);
    expect(availableClientBaristas.some((b) => b.name === record.clientBaristaName)).toBe(true);
  });

  it('falls back to internal name pools when no options are provided', () => {
    const record = generateMockMaintenanceRecord('test');

    expect(record.baristaName).toBeTypeOf('string');
    expect(record.baristaName.length).toBeGreaterThan(0);
    expect(record.clientBaristaName).toBeTypeOf('string');
    expect(record.clientBaristaName!.length).toBeGreaterThan(0);
  });

  it('produces valid ISO date strings for maintenanceDate and nextVisitDate', () => {
    const record = generateMockMaintenanceRecord('test');

    expect(isISODate(record.maintenanceDate)).toBe(true);
    if (record.nextVisitDate) {
      expect(isISODate(record.nextVisitDate)).toBe(true);
    }
  });

  it('sets visitRating between 1 and 5 inclusive', () => {
    const record = generateMockMaintenanceRecord('test');
    expect(record.visitRating).toBeGreaterThanOrEqual(1);
    expect(record.visitRating).toBeLessThanOrEqual(5);
  });

  it('sets visitZone to a valid value or null', () => {
    const record = generateMockMaintenanceRecord('test');
    const validZones: Array<string | null> = ['cairo', 'outside_cairo', 'el_sahel', null];
    expect(validZones).toContain(record.visitZone);
  });

  it('sets paidBy to a valid value', () => {
    const record = generateMockMaintenanceRecord('test');
    expect(['company', 'client']).toContain(record.paidBy);
  });

  it('returns empty problems when hadProblem is false', () => {
    let foundNoProblem = false;

    for (let i = 0; i < 50; i++) {
      const record = generateMockMaintenanceRecord(`test-${i}`);
      if (!record.hadProblem) {
        foundNoProblem = true;
        expect(record.problems).toEqual([]);
        expect(record.problemSolved).toBe(false);
      }
    }

    expect(foundNoProblem).toBe(true);
  });

  it('uses problems from supplied problem categories and allows problemSolved to vary when hadProblem is true', () => {
    const availableProblems = problemCategories.flatMap((cat) => cat.options.map((o) => o.value));
    let foundProblem = false;
    let foundSolved = false;

    for (let i = 0; i < 50; i++) {
      const record = generateMockMaintenanceRecord(`test-${i}`, { problemCategories });
      if (record.hadProblem && record.problems.length > 0) {
        foundProblem = true;
        record.problems.forEach((problem) => {
          expect(availableProblems).toContain(problem);
        });
        if (record.problemSolved) {
          foundSolved = true;
        }
      }
    }

    expect(foundProblem).toBe(true);
    expect(foundSolved).toBe(true);
  });

  it('returns empty partsReplaced when partsWereReplaced is false', () => {
    let foundNoParts = false;

    for (let i = 0; i < 50; i++) {
      const record = generateMockMaintenanceRecord(`test-${i}`);
      if (!record.partsWereReplaced) {
        foundNoParts = true;
        expect(record.partsReplaced).toEqual([]);
      }
    }

    expect(foundNoParts).toBe(true);
  });

  it('produces partsReplaced entries from the provided partsList', () => {
    let replacedCount = 0;
    const records = Array.from({ length: 50 }, (_, i) =>
      generateMockMaintenanceRecord(`test-${i}`, { partsList, servicesList })
    );

    records.forEach((record) => {
      if (record.partsWereReplaced && record.partsReplaced.length > 0) {
        replacedCount += 1;
        record.partsReplaced.forEach((p) => {
          expect(partsList.some((part) => part.value === p.name)).toBe(true);
          expect(p.count).toBeGreaterThan(0);
          expect(p.cost).toBeDefined();
          expect(typeof p.paidByClient).toBe('boolean');
        });
      }
    });

    expect(replacedCount).toBeGreaterThan(0);
  });

  it('produces servicesPerformed entries from the provided servicesList', () => {
    const record = generateMockMaintenanceRecord('test', {
      partsList: partsList,
      servicesList: servicesList,
    });

    expect(record.servicesPerformed.length).toBeGreaterThan(0);
    record.servicesPerformed.forEach((s) => {
      expect(servicesList.some((service) => service.value === s.name)).toBe(true);
      expect(s.count).toBeGreaterThan(0);
      expect(s.cost).toBeDefined();
      expect(typeof s.paidByClient).toBe('boolean');
    });
  });

  it('handles empty parts and services lists gracefully', () => {
    const record = generateMockMaintenanceRecord('test', {
      partsList: [],
      servicesList: [],
    });

    expect(record.servicesPerformed).toEqual([]);
    expect(record.partsReplaced).toEqual([]);
  });

  it('uses provided problemCategories when supplied', () => {
    const customCategories = [
      {
        title: 'Custom Issues',
        options: [{ label: 'Custom Problem', value: 'custom-problem' }],
      },
    ];

    let problemCount = 0;
    const records = Array.from({ length: 50 }, (_, i) =>
      generateMockMaintenanceRecord(`test-${i}`, { problemCategories: customCategories })
    );

    records.forEach((record) => {
      if (record.hadProblem && record.problems.length > 0) {
        problemCount += 1;
        expect(record.problems).toContain('custom-problem');
      }
    });

    expect(problemCount).toBeGreaterThan(0);
  });

  it('populates notes and recommendations with non-empty strings', () => {
    const record = generateMockMaintenanceRecord('test');
    expect(record.notes).toBeTypeOf('string');
    expect(record.notes!.length).toBeGreaterThan(0);
    expect(record.recommendations).toBeTypeOf('string');
    expect(record.recommendations!.length).toBeGreaterThan(0);
  });

  it('sets dailyLeaseCost to either undefined or a positive integer', () => {
    const record = generateMockMaintenanceRecord('test');
    if (record.dailyLeaseCost !== undefined) {
      expect(record.dailyLeaseCost).toBeGreaterThan(0);
      expect(Number.isInteger(record.dailyLeaseCost)).toBe(true);
    }
  });

  it('sets nextVisitDate to either undefined or a valid future date', () => {
    const record = generateMockMaintenanceRecord('test');
    if (record.nextVisitDate) {
      expect(isISODate(record.nextVisitDate)).toBe(true);
      expect(new Date(record.nextVisitDate).getTime()).toBeGreaterThanOrEqual(Date.now());
    }
  });

  it('includes at least one supervisor and one machine when generated', () => {
    const record = generateMockMaintenanceRecord('test');

    expect(record.supervisors.length).toBeGreaterThan(0);
    expect(record.supervisors[0].name).toBeTypeOf('string');
    expect(record.supervisors[0].phone).toMatch(/^01\d{9}$/);

    expect(record.machines!.length).toBeGreaterThan(0);
    expect(record.machines![0].name).toBeTypeOf('string');
    expect(record.machines![0].count).toBeGreaterThan(0);
  });

  it('generates valid photo entries when present', () => {
    let foundPhotos = false;

    for (let i = 0; i < 50; i++) {
      const record = generateMockMaintenanceRecord(`test-${i}`);
      if (record.photos && record.photos.length > 0) {
        foundPhotos = true;
        record.photos.forEach((photo) => {
          expect(photo.url).toMatch(/^https:\/\//);
          expect(['before', 'after', 'legacy']).toContain(photo.type);
        });
      }
    }

    expect(foundPhotos).toBe(true);
  });

  it('generates at most two photos with unique types', () => {
    let foundTwo = false;

    for (let i = 0; i < 50; i++) {
      const record = generateMockMaintenanceRecord(`test-${i}`);
      const photos = record.photos ?? [];

      expect(photos.length).toBeLessThanOrEqual(2);

      const types = photos.map((photo) => photo.type);
      expect(new Set(types).size).toBe(types.length);

      if (photos.length === 2) {
        foundTwo = true;
      }
    }

    expect(foundTwo).toBe(true);
  });

  it('keeps followUpVisits empty', () => {
    const record = generateMockMaintenanceRecord('test');
    expect(record.followUpVisits).toEqual([]);
  });

  it('generates different realistic data across multiple calls', () => {
    const records = Array.from({ length: 10 }, (_, i) =>
      generateMockMaintenanceRecord(`id-${i}`)
    );

    const dates = new Set(records.map((r) => r.maintenanceDate));
    expect(dates.size).toBeGreaterThan(1);

    const names = new Set(records.map((r) => r.baristaName));
    expect(names.size).toBeGreaterThan(1);

    const hadProblemCount = records.filter((r) => r.hadProblem).length;
    expect(hadProblemCount).toBeGreaterThan(0);
    expect(hadProblemCount).toBeLessThan(10);
  });
});
