import { describe, it, expect } from 'vitest';
import { migrateLegacyPartServiceKeys, transformImportedCompany, importFromJSON } from '../utils/importExport';

describe('migrateLegacyPartServiceKeys', () => {
  it('renames partName to name inside a part record', () => {
    const input = { id: '1', partName: 'Portafilter', count: 2 };
    const expected = { id: '1', name: 'Portafilter', count: 2 };
    expect(migrateLegacyPartServiceKeys(input)).toEqual(expected);
  });

  it('renames serviceName to name inside a service record', () => {
    const input = { id: '2', serviceName: 'Descaling', count: 1 };
    const expected = { id: '2', name: 'Descaling', count: 1 };
    expect(migrateLegacyPartServiceKeys(input)).toEqual(expected);
  });

  it('handles snake_case legacy keys', () => {
    const input = { part_name: 'Gasket', count: 3 };
    const expected = { name: 'Gasket', count: 3 };
    expect(migrateLegacyPartServiceKeys(input)).toEqual(expected);
  });

  it('keeps existing name and discards legacy key when both are present', () => {
    const input = { name: 'Seal', partName: 'Old Seal', count: 1 };
    const expected = { name: 'Seal', count: 1 };
    expect(migrateLegacyPartServiceKeys(input)).toEqual(expected);
  });

  it('renames keys inside maintenance record arrays', () => {
    const input = {
      maintenanceHistory: [
        {
          id: 1,
          partsReplaced: [{ partName: 'Filter', count: 2, cost: 10 }],
          servicesPerformed: [{ serviceName: 'Calibration', count: 1 }],
        },
      ],
    };
    const expected = {
      maintenanceHistory: [
        {
          id: 1,
          partsReplaced: [{ name: 'Filter', count: 2, cost: 10 }],
          servicesPerformed: [{ name: 'Calibration', count: 1 }],
        },
      ],
    };
    expect(migrateLegacyPartServiceKeys(input)).toEqual(expected);
  });

  it('recursively renames keys inside nested branch maintenance arrays', () => {
    const input = {
      branches: [
        {
          id: 1,
          maintenanceHistory: [
            { partsReplaced: [{ part_name: 'O-ring' }], servicesPerformed: [] },
          ],
        },
      ],
    };
    const expected = {
      branches: [
        {
          id: 1,
          maintenanceHistory: [
            { partsReplaced: [{ name: 'O-ring' }], servicesPerformed: [] },
          ],
        },
      ],
    };
    expect(migrateLegacyPartServiceKeys(input)).toEqual(expected);
  });

  it('handles an array of companies', () => {
    const input = [
      { companyName: 'A', partsReplaced: [{ partName: 'A' }] },
      { companyName: 'B', servicesPerformed: [{ serviceName: 'B' }] },
    ];
    const expected = [
      { companyName: 'A', partsReplaced: [{ name: 'A' }] },
      { companyName: 'B', servicesPerformed: [{ name: 'B' }] },
    ];
    expect(migrateLegacyPartServiceKeys(input)).toEqual(expected);
  });

  it('leaves primitive values unchanged', () => {
    expect(migrateLegacyPartServiceKeys('foo')).toBe('foo');
    expect(migrateLegacyPartServiceKeys(123)).toBe(123);
    expect(migrateLegacyPartServiceKeys(null)).toBe(null);
  });

  it('leaves objects without legacy keys untouched', () => {
    const input = { name: 'Filter', count: 2, paidByClient: false };
    expect(migrateLegacyPartServiceKeys(input)).toEqual(input);
  });

  describe('importFromJSON', () => {
    it('parses and returns raw JSON data unchanged', async () => {
      const payload = { companyName: 'Raw Co', maintenanceHistory: [] };
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      const file = new File([blob], 'raw.json', { type: 'application/json' });
      const result = await importFromJSON(file);
      expect(result).toEqual(payload);
    });
  });

  describe('transformImportedCompany', () => {
    it('normalises legacy part/service keys during transform', () => {
      const raw = {
        companyName: 'Acme',
        maintenanceHistory: [
          {
            id: 'm1',
            partsReplaced: [{ partName: 'Gasket', count: 1 }],
            servicesPerformed: [{ serviceName: 'Descale', count: 2 }],
          },
        ],
        branches: [
          {
            id: 'b1',
            maintenanceHistory: [
              {
                id: 'm2',
                partsReplaced: [{ part_name: 'O-ring' }],
              },
            ],
          },
        ],
      };

      const result = transformImportedCompany(raw);

      expect(result.maintenanceHistory?.[0].partsReplaced).toEqual([
        { name: 'Gasket', count: 1 },
      ]);
      expect(result.maintenanceHistory?.[0].servicesPerformed).toEqual([
        { name: 'Descale', count: 2 },
      ]);
      expect(result.branches?.[0].maintenanceHistory?.[0].partsReplaced).toEqual([
        { name: 'O-ring' },
      ]);
    });
  });
});
