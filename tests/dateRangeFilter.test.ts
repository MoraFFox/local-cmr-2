import { describe, it, expect } from "vitest";
import {
  filterMaintenanceByDateRange,
  getReportRecords,
  getDateRangePresets,
  formatDateRangeLabel,
  formatDateRangeLabelEn,
  ARABIC_PRESET_LABELS,
  DateRange,
} from "../utils/dateRangeFilter";
import type { MaintenanceRecord } from "../types";

const makeRecord = (
  date: string,
  followUps?: MaintenanceRecord[],
): MaintenanceRecord => ({
  id: Math.random(),
  maintenanceDate: date,
  baristaName: "Test",
  type: "scheduled",
  paidBy: "company",
  hadProblem: false,
  visitZone: undefined,
  problems: [],
  servicesPerformed: [],
  partsReplaced: [],
  partsWereReplaced: false,
  problemSolved: true,
  photos: [],
  notes: "",
  supervisors: [],
  followUpVisits: followUps,
});

describe("filterMaintenanceByDateRange", () => {
  const records = [
    makeRecord("2026-01-15"),
    makeRecord("2026-03-20"),
    makeRecord("2026-06-10"),
    makeRecord("2026-09-05"),
  ];

  it("returns all records when range has no dates", () => {
    const result = filterMaintenanceByDateRange(records, { preset: "allTime" });
    expect(result).toHaveLength(4);
  });

  it("returns all records when range is undefined/null-like", () => {
    const result = filterMaintenanceByDateRange(records, {});
    expect(result).toHaveLength(4);
  });

  it("filters by start date (inclusive)", () => {
    const result = filterMaintenanceByDateRange(records, {
      startDate: "2026-03-20",
    });
    expect(result.map((r) => r.maintenanceDate)).toEqual([
      "2026-03-20",
      "2026-06-10",
      "2026-09-05",
    ]);
  });

  it("filters by end date (inclusive)", () => {
    const result = filterMaintenanceByDateRange(records, {
      endDate: "2026-06-10",
    });
    expect(result.map((r) => r.maintenanceDate)).toEqual([
      "2026-01-15",
      "2026-03-20",
      "2026-06-10",
    ]);
  });

  it("filters by both start and end date", () => {
    const result = filterMaintenanceByDateRange(records, {
      startDate: "2026-03-01",
      endDate: "2026-07-01",
    });
    expect(result.map((r) => r.maintenanceDate)).toEqual([
      "2026-03-20",
      "2026-06-10",
    ]);
  });

  it("returns empty array when no records match", () => {
    const result = filterMaintenanceByDateRange(records, {
      startDate: "2027-01-01",
    });
    expect(result).toHaveLength(0);
  });

  it("recursively filters followUpVisits", () => {
    const recs = [
      makeRecord("2026-03-15", [
        makeRecord("2026-01-01"), // should be excluded
        makeRecord("2026-03-20"), // should stay
      ]),
    ];
    const result = filterMaintenanceByDateRange(recs, {
      startDate: "2026-03-01",
    });
    expect(result).toHaveLength(1);
    expect(result[0].followUpVisits).toHaveLength(1);
    expect(result[0].followUpVisits![0].maintenanceDate).toBe("2026-03-20");
  });

  it("does not mutate original records", () => {
    const original = [...records];
    filterMaintenanceByDateRange(records, { startDate: "2026-01-01" });
    expect(records).toEqual(original);
  });

  it("returns empty when startDate after endDate (reversed range)", () => {
    const result = filterMaintenanceByDateRange(records, {
      startDate: "2026-12-01",
      endDate: "2026-01-01",
    });
    expect(result).toHaveLength(0);
  });
});

describe("getReportRecords", () => {
  it("keeps normal records and drops logistics-only visits", () => {
    const records = [
      makeRecord("2026-01-15"),
      { ...makeRecord("2026-01-16"), isLogisticsVisit: true },
      makeRecord("2026-01-17"),
    ];
    const result = getReportRecords(records);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.maintenanceDate)).toEqual(["2026-01-15", "2026-01-17"]);
  });

  it("recursively strips logistics-only follow-up visits", () => {
    const records = [
      makeRecord("2026-03-15", [
        { ...makeRecord("2026-03-20"), isLogisticsVisit: true },
        makeRecord("2026-03-22"),
      ]),
    ];
    const result = getReportRecords(records);
    expect(result).toHaveLength(1);
    expect(result[0].followUpVisits).toHaveLength(1);
    expect(result[0].followUpVisits![0].maintenanceDate).toBe("2026-03-22");
  });

  it("returns all records when none are logistics visits", () => {
    const records = [makeRecord("2026-01-15"), makeRecord("2026-01-17")];
    const result = getReportRecords(records);
    expect(result).toHaveLength(2);
  });

  it("returns an empty array for empty input", () => {
    expect(getReportRecords([])).toEqual([]);
  });

  it("does not mutate the original records", () => {
    const records = [
      { ...makeRecord("2026-01-15"), isLogisticsVisit: true },
      makeRecord("2026-01-16"),
    ];
    const original = JSON.stringify(records);
    getReportRecords(records);
    expect(JSON.stringify(records)).toBe(original);
  });
});

describe("getDateRangePresets", () => {
  it("returns 6 presets", () => {
    const presets = getDateRangePresets();
    expect(Object.keys(presets)).toHaveLength(6);
  });

  it("allTime preset has no startDate/endDate", () => {
    const presets = getDateRangePresets();
    expect(presets.allTime.startDate).toBeUndefined();
    expect(presets.allTime.endDate).toBeUndefined();
    expect(presets.allTime.preset).toBe("allTime");
  });

  it("today preset has same start and end date", () => {
    const presets = getDateRangePresets();
    expect(presets.today.startDate).toBe(presets.today.endDate);
  });

  it("presets have ISO date format (YYYY-MM-DD)", () => {
    const presets = getDateRangePresets();
    const isoRe = /^\d{4}-\d{2}-\d{2}$/;
    expect(presets.today.startDate).toMatch(isoRe);
    expect(presets.thisMonth.startDate).toMatch(isoRe);
  });
});

describe("formatDateRangeLabel", () => {
  it("returns empty string for allTime", () => {
    expect(formatDateRangeLabel({ preset: "allTime" })).toBe("");
  });

  it("returns empty string for empty range", () => {
    expect(formatDateRangeLabel({})).toBe("");
  });

  it("returns Arabic date for single day", () => {
    const label = formatDateRangeLabel({
      startDate: "2026-07-15",
      endDate: "2026-07-15",
      preset: "custom",
    });
    expect(label).toContain("يوليو");
    expect(label).toContain("15");
    expect(label).toContain("2026");
  });

  it("returns range label for two different dates", () => {
    const label = formatDateRangeLabel({
      startDate: "2026-07-01",
      endDate: "2026-07-15",
      preset: "custom",
    });
    expect(label).toContain("—");
    expect(label).toContain("يوليو");
  });
});

describe("ARABIC_PRESET_LABELS", () => {
  it("has labels for all 7 keys", () => {
    const keys = [
      "allTime",
      "today",
      "thisWeek",
      "thisMonth",
      "thisQuarter",
      "thisYear",
      "custom",
    ];
    keys.forEach((k) => {
      expect(ARABIC_PRESET_LABELS[k]).toBeDefined();
      expect(typeof ARABIC_PRESET_LABELS[k]).toBe("string");
    });
  });
});

describe("formatDateRangeLabelEn", () => {
  it("returns empty string for allTime", () => {
    expect(formatDateRangeLabelEn({ preset: "allTime" })).toBe("");
  });

  it("returns empty string for empty range", () => {
    expect(formatDateRangeLabelEn({})).toBe("");
  });

  it("returns English date for single day", () => {
    const label = formatDateRangeLabelEn({
      startDate: "2026-07-15",
      endDate: "2026-07-15",
      preset: "custom",
    });
    expect(label).toContain("July");
    expect(label).toContain("15");
    expect(label).toContain("2026");
  });

  it("returns range label for two different dates", () => {
    const label = formatDateRangeLabelEn({
      startDate: "2026-07-01",
      endDate: "2026-07-15",
      preset: "custom",
    });
    expect(label).toContain("—");
    expect(label).toContain("July");
  });

  it("prepends From/Until for open-ended ranges", () => {
    expect(formatDateRangeLabelEn({ startDate: "2026-07-01" })).toMatch(/^From /);
    expect(formatDateRangeLabelEn({ endDate: "2026-07-15" })).toMatch(/^Until /);
  });
});
