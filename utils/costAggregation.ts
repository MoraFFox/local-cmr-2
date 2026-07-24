/** @format */

import { FormData, MaintenanceRecord, Part, Service, PartRecord, ServiceRecord, Branch, Machine } from "../types";
import { getAllVisitZones, getVisitZoneFee, getVisitZoneLabel, getVisitZoneFeesMap, getVisitZoneLabelsMap } from "./visitZones";

// ── Dynamic Zone Helpers (re-exports for backward compatibility) ──
// NOTE: These are dynamic proxies that always delegate to visitZones.ts.
// Prefer getVisitZoneFee()/getVisitZoneLabel() for direct lookups.
export const visitZoneFees = new Proxy<Record<string, number>>({}, {
  get: (_, key: string) => getVisitZoneFee(key),
});
export const visitZoneLabels = new Proxy<Record<string, string>>({}, {
  get: (_, key: string) => getVisitZoneLabel(key),
});

// Format a number with Latin (English) digits
export const formatEnNumber = (value: number): string =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);

export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP", minimumFractionDigits: 0 }).format(value);

export const formatPdfCurrency = (value: number): string => `${formatEnNumber(value)} ج.م`;

// ── Types ──

export interface AggregatedItem {
  name: string;
  count: number;
  totalCost: number;
  unitCost: number;
}

export interface AggregatedCosts {
  parts: Map<string, AggregatedItem>;
  services: Map<string, AggregatedItem>;
  /** Parts paid by client (not Mido's responsibility) */
  clientParts: Map<string, AggregatedItem>;
  /** Services paid by client */
  clientServices: Map<string, AggregatedItem>;
  totalVisitFees: number;
  totalPartsCost: number;
  totalServicesCost: number;
  totalClientPartsCost: number;
  totalClientServicesCost: number;
  totalLeaseRevenue: number;
  grandTotalCompanyCost: number;
  grandTotal: number;
}

export interface VisitZoneBreakdown {
  zone: string;
  label: string;
  rate: number;
  visits: number;
  total: number;
}

export interface TechnicianSummary {
  name: string;
  visits: number;
  avgRating: number;
  partsUsed: number;
  problemsResolved: number;
  totalProblems: number;
}

export interface MachineLeaseSummary {
  name: string;
  type: "leased" | "consumption" | "bought" | "unknown";
  dailyRate: number;
  daysActive: number;
  revenue: number;
}

export interface OperationalKPIs {
  totalVisits: number;
  totalProblems: number;
  problemsResolved: number;
  resolutionRate: number; // 0-100
  totalPartsUsed: number;
  avgVisitRating: number;
  totalRatedVisits: number;
}

export interface BranchCostSummary {
  branchName: string;
  visitFees: number;
  partsCost: number;
  servicesCost: number;
  leaseRevenue: number;
  netCost: number;
  visitCount: number;
}

// ── Helpers ──

const getKey = (name: string, cost: number): string => `${name}#${cost}`;

const flattenRecords = (records: MaintenanceRecord[]): MaintenanceRecord[] => {
  const result: MaintenanceRecord[] = [];
  const traverse = (recs: MaintenanceRecord[]) => {
    recs.forEach((r) => {
      result.push(r);
      if (r.followUpVisits && r.followUpVisits.length > 0) {
        traverse(r.followUpVisits);
      }
    });
  };
  traverse(records);
  return result;
};

const resolvePartCost = (partRecord: PartRecord, partsList: Part[]): number =>
  partRecord.cost ?? partsList.find((p) => p.value === partRecord.name)?.cost ?? 0;

const resolveServiceCost = (serviceRecord: ServiceRecord, servicesList: Service[]): number =>
  serviceRecord.cost ?? servicesList.find((s) => s.value === serviceRecord.name)?.cost ?? 0;

// ── Core Aggregation ──

export const aggregateCosts = (
  formData: FormData,
  partsList: Part[],
  servicesList: Service[],
): AggregatedCosts => {
  const aggregated: AggregatedCosts = {
    parts: new Map(),
    services: new Map(),
    clientParts: new Map(),
    clientServices: new Map(),
    totalVisitFees: 0,
    totalPartsCost: 0,
    totalServicesCost: 0,
    totalClientPartsCost: 0,
    totalClientServicesCost: 0,
    totalLeaseRevenue: 0,
    grandTotalCompanyCost: 0,
    grandTotal: 0,
  };

  const processRecord = (record: MaintenanceRecord) => {
    // Visit fees
    if (record.visitZone) {
      aggregated.totalVisitFees += getVisitZoneFee(record.visitZone);
    }

    // Parts — split by who pays
    (record.partsReplaced || []).forEach((pr) => {
      const unitCost = resolvePartCost(pr, partsList);
      const key = getKey(pr.name, unitCost);
      const map = pr.paidByClient ? aggregated.clientParts : aggregated.parts;

      const existing = map.get(key) || { name: pr.name, count: 0, totalCost: 0, unitCost };
      existing.count += pr.count;
      existing.totalCost += pr.count * unitCost;
      map.set(key, existing);
    });

    // Services — split by who pays
    (record.servicesPerformed || []).forEach((sr) => {
      const unitCost = resolveServiceCost(sr, servicesList);
      const key = getKey(sr.name, unitCost);
      const map = sr.paidByClient ? aggregated.clientServices : aggregated.services;

      const existing = map.get(key) || { name: sr.name, count: 0, totalCost: 0, unitCost };
      existing.count += sr.count;
      existing.totalCost += sr.count * unitCost;
      map.set(key, existing);
    });

    // Daily lease cost
    if (record.dailyLeaseCost) {
      aggregated.totalLeaseRevenue += Number(record.dailyLeaseCost);
    }

    // Follow-ups
    if (record.followUpVisits) {
      record.followUpVisits.forEach(processRecord);
    }
  };

  // Process all records across company and branches
  formData.maintenanceHistory.forEach(processRecord);
  formData.branches.forEach((branch) => {
    branch.maintenanceHistory.forEach(processRecord);
  });

  // Compute totals
  aggregated.totalPartsCost = Array.from(aggregated.parts.values()).reduce((sum, p) => sum + p.totalCost, 0);
  aggregated.totalServicesCost = Array.from(aggregated.services.values()).reduce((sum, s) => sum + s.totalCost, 0);
  aggregated.totalClientPartsCost = Array.from(aggregated.clientParts.values()).reduce((sum, p) => sum + p.totalCost, 0);
  aggregated.totalClientServicesCost = Array.from(aggregated.clientServices.values()).reduce((sum, s) => sum + s.totalCost, 0);

  // Grand total = company costs + visit fees (lease revenue offsets company cost)
  const companyDirectCosts = aggregated.totalPartsCost + aggregated.totalServicesCost + aggregated.totalVisitFees;
  aggregated.grandTotalCompanyCost = companyDirectCosts - aggregated.totalLeaseRevenue;
  aggregated.grandTotal = companyDirectCosts + aggregated.totalClientPartsCost + aggregated.totalClientServicesCost;

  return aggregated;
};

// ── Aggregate costs for a single branch ──

export const aggregateBranchCosts = (
  branch: Branch,
  partsList: Part[],
  servicesList: Service[],
): AggregatedCosts => {
  // Create a minimal FormData-like structure for the branch
  const pseudoForm: FormData = {
    companyName: "",
    email: "",
    taxNumber: "",
    location: "",
    hasBranches: false,
    usesOurMachines: null,
    machines: [],
    branchCount: 0,
    branches: [],
    warehouse: { location: "", contacts: [] },
    baristas: [],
    maintenanceHistory: branch.maintenanceHistory,
    contacts: [],
  };
  return aggregateCosts(pseudoForm, partsList, servicesList);
};

// ── Visit Zone Breakdown ──

export const getVisitZoneBreakdown = (records: MaintenanceRecord[]): VisitZoneBreakdown[] => {
  const allRecords = flattenRecords(records);
  const zoneCounts: Record<string, number> = {};

  allRecords.forEach((r) => {
    if (r.visitZone) {
      zoneCounts[r.visitZone] = (zoneCounts[r.visitZone] || 0) + 1;
    }
  });

  const allZones = getAllVisitZones();
  return allZones.map((z) => ({
    zone: z.key,
    label: z.label,
    rate: z.fee,
    visits: zoneCounts[z.key] || 0,
    total: (zoneCounts[z.key] || 0) * z.fee,
  }));
};

// ── Technician Summary ──

export const getTechnicianSummary = (records: MaintenanceRecord[]): TechnicianSummary[] => {
  const allRecords = flattenRecords(records);
  const techMap = new Map<string, TechnicianSummary>();

  allRecords.forEach((r) => {
    const name = r.baristaName || "غير معروف";
    const existing = techMap.get(name) || {
      name,
      visits: 0,
      avgRating: 0,
      partsUsed: 0,
      problemsResolved: 0,
      totalProblems: 0,
    };

    existing.visits += 1;
    if (r.visitRating != null && r.visitRating > 0) {
      existing.avgRating += r.visitRating;
    }
    existing.partsUsed += (r.partsReplaced || []).reduce((sum, p) => sum + (p.count || 0), 0);

    if (r.hadProblem) {
      existing.totalProblems += 1;
      if (r.problemSolved) existing.problemsResolved += 1;
    }

    techMap.set(name, existing);
  });

  // Finalize averages
  return Array.from(techMap.values()).map((t) => {
    // Count visits with actual ratings
    const ratedVisits = allRecords.filter(
      (r) => r.baristaName === t.name && r.visitRating != null && r.visitRating > 0,
    ).length;
    return {
      ...t,
      avgRating: ratedVisits > 0 ? Math.round((t.avgRating / ratedVisits) * 10) / 10 : 0,
    };
  });
};

// ── Machine Lease Summary ──

export const getMachineLeaseSummary = (
  machines: Machine[],
  records: MaintenanceRecord[],
): MachineLeaseSummary[] => {
  const allRecords = flattenRecords(records);
  const visitCount = allRecords.length;

  return machines.map((m) => {
    const type = m.machineOwnershipType || "unknown";
    const dailyRate = m.dailyLeaseCost || 0;
    return {
      name: m.machineName || "ماكينة",
      type,
      dailyRate,
      daysActive: visitCount,
      revenue: dailyRate * visitCount,
    };
  });
};

// ── Operational KPIs ──

export const getOperationalKPIs = (records: MaintenanceRecord[]): OperationalKPIs => {
  const allRecords = flattenRecords(records);

  let totalProblems = 0;
  let problemsResolved = 0;
  let totalPartsUsed = 0;
  let avgRatingSum = 0;
  let totalRatedVisits = 0;

  allRecords.forEach((r) => {
    if (r.hadProblem) {
      totalProblems += 1;
      if (r.problemSolved) problemsResolved += 1;
    }
    totalPartsUsed += (r.partsReplaced || []).reduce((sum, p) => sum + (p.count || 0), 0);
    if (r.visitRating != null && r.visitRating > 0) {
      avgRatingSum += r.visitRating;
      totalRatedVisits += 1;
    }
  });

  return {
    totalVisits: allRecords.length,
    totalProblems,
    problemsResolved,
    resolutionRate: totalProblems > 0 ? Math.round((problemsResolved / totalProblems) * 100) : 100,
    totalPartsUsed,
    avgVisitRating: totalRatedVisits > 0 ? Math.round((avgRatingSum / totalRatedVisits) * 10) / 10 : 0,
    totalRatedVisits,
  };
};

// ── Branch Cost Summary (for company-level overview table) ──

export const getBranchCostSummary = (
  branches: Branch[],
  partsList: Part[],
  servicesList: Service[],
): BranchCostSummary[] => {
  return branches.map((branch) => {
    const costs = aggregateBranchCosts(branch, partsList, servicesList);
    return {
      branchName: branch.branchName || "فرع",
      visitFees: costs.totalVisitFees,
      partsCost: costs.totalPartsCost,
      servicesCost: costs.totalServicesCost,
      leaseRevenue: costs.totalLeaseRevenue,
      netCost: costs.grandTotalCompanyCost,
      visitCount: flattenRecords(branch.maintenanceHistory).length,
    };
  });
};

// ── Per-record cost breakdown ──

export interface RecordCostSummary {
  partsCost: number;
  servicesCost: number;
  leaseCost: number;
  visitFee: number;
  total: number;
}

export const getRecordCostSummary = (
  record: MaintenanceRecord,
  partsList: Part[],
  servicesList: Service[],
): RecordCostSummary => {
  let partsCost = 0;
  let servicesCost = 0;
  const leaseCost = record.dailyLeaseCost || 0;
  const visitFee = getVisitZoneFee(record.visitZone);

  (record.partsReplaced || []).forEach((pr) => {
    partsCost += (pr.count || 0) * resolvePartCost(pr, partsList);
  });
  (record.servicesPerformed || []).forEach((sr) => {
    servicesCost += (sr.count || 0) * resolveServiceCost(sr, servicesList);
  });

  return {
    partsCost,
    servicesCost,
    leaseCost,
    visitFee,
    total: partsCost + servicesCost + leaseCost + visitFee,
  };
};

// ── Problem frequency ──

export interface ProblemFrequency {
  name: string;
  count: number;
}

export const getProblemFrequency = (records: MaintenanceRecord[]): ProblemFrequency[] => {
  const allRecords = flattenRecords(records);
  const map = new Map<string, number>();

  allRecords.forEach((r) => {
    (r.problems || []).forEach((p) => {
      map.set(p, (map.get(p) || 0) + 1);
    });
  });

  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
};
