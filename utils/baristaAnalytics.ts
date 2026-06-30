/** @format */

import { FormData, Barista, MaintenanceRecord } from "../types";

export interface AggregatedBarista extends Omit<Barista, 'rating'> {
  companyName: string;
  normalizedCompanyName: string;
  branchName: string;
  visitCount: number;
  companyCost: number;
  clientCost: number;
  averageVisitRating: number;
  lastActive?: string;
  isAutoDetected?: boolean;
  _ratingSum?: number;
  _ratingCount?: number;
  _dates?: string[];
  _branchesVisited?: string[];  // Changed from Set<string> for JSON serialization
  _companiesVisited?: string[]; // Changed from Set<string> for JSON serialization
  _rawNames?: string[];         // Changed from Set<string> for JSON serialization
  records?: Array<
    MaintenanceRecord & { companyName: string; branchName: string }
  >;
  sources?: Array<{
    submissionId: number;
    branchIndex: number | null;
    baristaIndex: number;
    baristaId: number;
  }>;
}

// --- Normalization Utilities ---

export const normalize = (str?: string) => {
  if (!str) return "";
  let normalized = str.trim().toLowerCase();
  normalized = normalized.replace(/[\u064B-\u065F]/g, "");
  normalized = normalized.replace(/[أإآ]/g, "ا");
  normalized = normalized.replace(/[ةه]/g, "ه");
  normalized = normalized.replace(/[ىي]/g, "ي");
  normalized = normalized.replace(/عبد\s+/g, "عبد");
  normalized = normalized.replace(/ابو\s+/g, "ابو");
  normalized = normalized.replace(
    /[\u200B-\u200F\uFEFF\u061C\u202A-\u202E]/g,
    "",
  );
  normalized = normalized.replace(/y$/g, "i");
  normalized = normalized.replace(/[^a-z0-9\u0600-\u06FF\s]/g, "");
  return normalized.replace(/\s+/g, " ").trim();
};

const BARISTA_NAME_ALIASES: Array<{ alias: string; canonical: string }> = [
  { alias: "احمد مصطفي", canonical: "Ahmed Mostafa" },
  { alias: "احمد مصطفى", canonical: "Ahmed Mostafa" },
  { alias: "أحمد مصطفى", canonical: "Ahmed Mostafa" },
  { alias: "Ahmed Moustafa", canonical: "Ahmed Mostafa" },
  { alias: "رضا زينهم", canonical: "Reda Zienhom" },
  { alias: "احمد محمد", canonical: "Ahmed Mohamed" },
  { alias: "أحمد محمد", canonical: "Ahmed Mohamed" },
  { alias: "مصطفي محمد", canonical: "Mostafa Mohamed" },
];

export const mapBaristaName = (name: string) => {
  if (!name) return name;
  const n = normalize(name);
  for (const a of BARISTA_NAME_ALIASES) {
    if (normalize(a.alias) === n) return a.canonical;
  }
  return n;
};

export const normalizeCompany = (str: string) => {
  if (!str) return "";
  let normalized = str.trim().toLowerCase();
  normalized = normalized.replace(
    /[\u200B-\u200F\uFEFF\u061C\u202A-\u202E]/g,
    "",
  );
  return normalized.replace(/\s+/g, " ").trim();
};

// Fix 4.6: Add cache for Levenshtein distance calculations
const distanceCache = new Map<string, number>();

const levenshteinDistance = (a: string, b: string): number => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  
  // Fix 4.6: Create cache key (sorted to handle both orders)
  const cacheKey = a < b ? `${a}|${b}` : `${b}|${a}`;
  
  // Check cache
  if (distanceCache.has(cacheKey)) {
    return distanceCache.get(cacheKey)!;
  }
  
  // Calculate distance
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1),
        );
      }
    }
  }
  
  const result = matrix[b.length][a.length];
  
  // Fix 4.6: Cache result (limit cache size to prevent memory issues)
  if (distanceCache.size < 10000) {
    distanceCache.set(cacheKey, result);
  }
  
  return result;
};

// Fix 4.6: Add function to clear cache if needed
export const clearDistanceCache = () => distanceCache.clear();

const getSimilarity = (s1: string, s2: string): number => {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  if (longer.length === 0) return 1.0;
  return (
    (longer.length - levenshteinDistance(longer, shorter)) /
    parseFloat(longer.length.toString())
  );
};

export const getMatchScore = (name1: string, name2: string) => {
  const n1 = normalize(name1);
  const n2 = normalize(name2);
  if (n1 === n2) return 1.0;
  const levScore = getSimilarity(n1, n2);
  const tokens1 = new Set(n1.split(" "));
  const tokens2 = new Set(n2.split(" "));
  let intersection = 0;
  tokens1.forEach((t) => {
    if (tokens2.has(t) && t.length >= 2) intersection++;
  });
  const minTokens = Math.min(tokens1.size, tokens2.size);
  const tokenScore = minTokens > 0 ? intersection / minTokens : 0;
  if (tokenScore === 1.0) return 0.95;
  return Math.max(levScore, tokenScore * 0.9);
};

// --- Financial Constants ---
export const visitZoneFees: Record<
  "cairo" | "outside_cairo" | "el_sahel",
  number
> = {
  cairo: 500,
  outside_cairo: 1500,
  el_sahel: 4000,
};

export const aggregateBaristaData = (
  submissions: FormData[],
): AggregatedBarista[] => {
  const baristaMap = new Map<string, AggregatedBarista>();

  const makeKey = (name: string) => normalize(mapBaristaName(name));

  const mergeIntoProfile = (
    existing: AggregatedBarista,
    incoming: Partial<AggregatedBarista>,
    companyContext: string,
    branchContext: string,
    record?: MaintenanceRecord,
  ) => {
    existing.visitCount += incoming.visitCount || 0;
    existing.companyCost += incoming.companyCost || 0;
    existing.clientCost += incoming.clientCost || 0;

    if (incoming._ratingSum) {
      existing._ratingSum = (existing._ratingSum || 0) + incoming._ratingSum;
      existing._ratingCount =
        (existing._ratingCount || 0) + (incoming._ratingCount || 0);
    }

    if (incoming._dates)
      existing._dates = [...(existing._dates || []), ...incoming._dates];

    if (incoming.sources) {
      if (!existing.sources) existing.sources = [];
      existing.sources.push(...incoming.sources);
    }

    // Use arrays instead of Sets - add unique values
    if (companyContext && !existing._companiesVisited?.includes(companyContext)) {
      if (!existing._companiesVisited) existing._companiesVisited = [];
      existing._companiesVisited.push(companyContext);
    }
    if (branchContext && !existing._branchesVisited?.includes(branchContext)) {
      if (!existing._branchesVisited) existing._branchesVisited = [];
      existing._branchesVisited.push(branchContext);
    }

    if (!incoming.isAutoDetected && existing.isAutoDetected) {
      existing.isAutoDetected = false;
      existing.name = incoming.name || existing.name;
    }
    if (incoming.name && !existing._rawNames?.includes(incoming.name)) {
      if (!existing._rawNames) existing._rawNames = [];
      existing._rawNames.push(incoming.name);
    }

    if (record) {
      if (!existing.records) existing.records = [];
      existing.records.push({
        ...record,
        companyName: companyContext,
        branchName: branchContext,
      });
    }
  };

  // 1. Load Registered Baristas
  submissions.forEach((sub) => {
    const processReg = (
      b: Barista,
      branch: string,
      branchIndex: number | null,
      baristaIndex: number,
    ) => {
      const key = makeKey(b.name);
      const source = {
        submissionId: sub.id!,
        branchIndex,
        baristaIndex,
        baristaId: b.id,
      };

      if (baristaMap.has(key)) {
        mergeIntoProfile(
          baristaMap.get(key)!,
          { ...b, visitCount: 0, sources: [source] },
          sub.companyName,
          branch,
        );
      } else {
        baristaMap.set(key, {
          ...b,
          companyName: sub.companyName,
          normalizedCompanyName: normalizeCompany(sub.companyName),
          branchName: branch,
          visitCount: 0,
          companyCost: 0,
          clientCost: 0,
          averageVisitRating: 0,
          _ratingSum: 0,
          _ratingCount: 0,
          _dates: [],
          _branchesVisited: [branch],  // Use array instead of Set
          _companiesVisited: [sub.companyName],  // Use array instead of Set
          _rawNames: [b.name],  // Use array instead of Set
          isAutoDetected: false,
          records: [],
          sources: [source],
        });
      }
    };
    sub.baristas.forEach((b, idx) => processReg(b, "Main Office", null, idx));
    sub.branches.forEach((br, brIdx) =>
      br.baristas.forEach((b, bIdx) =>
        processReg(b, br.branchName || "Branch", brIdx, bIdx),
      ),
    );
  });

  // 2. Scan Maintenance Records
  const processRecord = (
    rec: MaintenanceRecord,
    company: string,
    branch: string,
  ) => {
    if (!rec.baristaName) return;

    let recCostClient = 0;
    let recCostCompany = 0;

    const visitFee = rec.visitZone ? visitZoneFees[rec.visitZone] || 0 : 0;
    if (rec.paidBy === "client") {
      recCostClient += visitFee;
    } else {
      recCostCompany += visitFee;
    }

    if (rec.partsReplaced) {
      rec.partsReplaced.forEach((p) => {
        const total = (p.cost || 0) * (p.count || 1);
        p.paidByClient ? (recCostClient += total) : (recCostCompany += total);
      });
    }
    if (rec.servicesPerformed) {
      rec.servicesPerformed.forEach((s) => {
        const total = (s.cost || 0) * (s.count || 1);
        s.paidByClient ? (recCostClient += total) : (recCostCompany += total);
      });
    }

    let bestMatch: AggregatedBarista | null = null;
    let bestScore = 0;
    for (const b of baristaMap.values()) {
      let currentMaxScore = getMatchScore(b.name, rec.baristaName);
      if (b._rawNames) {
        b._rawNames.forEach((rawName) => {
          const aliasScore = getMatchScore(rawName, rec.baristaName);
          if (aliasScore > currentMaxScore) currentMaxScore = aliasScore;
        });
      }
      if (currentMaxScore > 0.7 && currentMaxScore > bestScore) {
        bestScore = currentMaxScore;
        bestMatch = b;
      }
    }

    if (bestMatch) {
      mergeIntoProfile(
        bestMatch,
        {
          visitCount: 1,
          companyCost: recCostCompany,
          clientCost: recCostClient,
          _ratingSum:
            rec.visitRating && rec.visitRating > 0 ? rec.visitRating : 0,
          _ratingCount: rec.visitRating && rec.visitRating > 0 ? 1 : 0,
          _dates: rec.maintenanceDate ? [rec.maintenanceDate] : [],
        },
        company,
        branch,
        rec,
      );
      if (!bestMatch._rawNames?.includes(rec.baristaName)) {
        if (!bestMatch._rawNames) bestMatch._rawNames = [];
        bestMatch._rawNames.push(rec.baristaName);
      }
    } else {
      const newKey = makeKey(rec.baristaName);
      if (baristaMap.has(newKey)) {
        mergeIntoProfile(
          baristaMap.get(newKey)!,
          {
            visitCount: 1,
            companyCost: recCostCompany,
            clientCost: recCostClient,
            _ratingSum: rec.visitRating || 0,
            _ratingCount: rec.visitRating ? 1 : 0,
            _dates: rec.maintenanceDate ? [rec.maintenanceDate] : [],
          },
          company,
          branch,
          rec,
        );
      } else {
        baristaMap.set(newKey, {
          id: -Date.now() - Math.random(),
          name: rec.baristaName,
          companyName: company,
          normalizedCompanyName: normalizeCompany(company),
          branchName: branch,
          phone: "",
          visitCount: 1,
          companyCost: recCostCompany,
          clientCost: recCostClient,
          averageVisitRating: rec.visitRating || 0,
          _ratingSum: rec.visitRating || 0,
          _ratingCount: rec.visitRating ? 1 : 0,
          _dates: rec.maintenanceDate ? [rec.maintenanceDate] : [],
          _branchesVisited: [branch],  // Use array instead of Set
          _companiesVisited: [company],  // Use array instead of Set
          _rawNames: [rec.baristaName],  // Use array instead of Set
          isAutoDetected: true,
          records: [{ ...rec, companyName: company, branchName: branch }],
        });
      }
    }

    if (rec.followUpVisits) {
      rec.followUpVisits.forEach((subRec) =>
        processRecord(subRec, company, branch),
      );
    }
  };

  submissions.forEach((sub) => {
    sub.maintenanceHistory.forEach((r) =>
      processRecord(r, sub.companyName, "Main Office"),
    );
    sub.branches.forEach((br) =>
      br.maintenanceHistory.forEach((r) =>
        processRecord(r, sub.companyName, br.branchName || "Branch"),
      ),
    );
  });

  // 3. Final Merge Pass
  let profiles = Array.from(baristaMap.values());
  profiles.sort((a, b) => b.name.length - a.name.length);
  const finalProfiles: AggregatedBarista[] = [];
  const absorbedIds = new Set<number>();

  for (let i = 0; i < profiles.length; i++) {
    const p1 = profiles[i];
    if (absorbedIds.has(p1.id)) continue;
    for (let j = i + 1; j < profiles.length; j++) {
      const p2 = profiles[j];
      if (absorbedIds.has(p2.id)) continue;
      const score = getMatchScore(p1.name, p2.name);
      const isExactMatch = normalize(p1.name) === normalize(p2.name);
      if (score > 0.75 || isExactMatch) {
        p1.visitCount += p2.visitCount;
        p1.companyCost += p2.companyCost;
        p1.clientCost += p2.clientCost;
        p1._ratingSum = (p1._ratingSum || 0) + (p2._ratingSum || 0);
        p1._ratingCount = (p1._ratingCount || 0) + (p2._ratingCount || 0);
        p1._dates = [...(p1._dates || []), ...(p2._dates || [])];
        // Merge arrays with unique values
        p2._branchesVisited?.forEach((b) => {
          if (p1._branchesVisited && !p1._branchesVisited.includes(b)) {
            p1._branchesVisited.push(b);
          }
        });
        p2._companiesVisited?.forEach((c) => {
          if (p1._companiesVisited && !p1._companiesVisited.includes(c)) {
            p1._companiesVisited.push(c);
          }
        });
        p2._rawNames?.forEach((n) => {
          if (p1._rawNames && !p1._rawNames.includes(n)) {
            p1._rawNames.push(n);
          }
        });
        if (p2.records) {
          if (!p1.records) p1.records = [];
          p1.records.push(...p2.records);
        }
        if (p2.sources) {
          if (!p1.sources) p1.sources = [];
          p1.sources.push(...p2.sources);
        }
        if (!p2.isAutoDetected && p1.isAutoDetected) {
          p1.name = p2.name;
          p1.isAutoDetected = false;
        }
        absorbedIds.add(p2.id);
      }
    }
    finalProfiles.push(p1);
  }

  return finalProfiles
    .map((b) => {
      b._dates?.sort(
        (d1, d2) => new Date(d2).getTime() - new Date(d1).getTime(),
      );
      const avg =
        b._ratingCount && b._ratingCount > 0
          ? (b._ratingSum || 0) / b._ratingCount
          : 0;
      let displayBranch = b.branchName;
      if (b._branchesVisited && b._branchesVisited.length > 1)
        displayBranch = `Multi-Branch (${b._branchesVisited.length})`;
      let displayCompany = b.companyName;
      if (b._companiesVisited && b._companiesVisited.length > 1)
        displayCompany = `Multi-Company (${b._companiesVisited.length})`;

      // Ensure records are also sorted by date
      b.records?.sort(
        (r1, r2) =>
          new Date(r2.maintenanceDate).getTime() -
          new Date(r1.maintenanceDate).getTime(),
      );

      return {
        ...b,
        branchName: displayBranch,
        companyName: displayCompany,
        averageVisitRating: avg,
        lastActive: b._dates?.[0],
      };
    })
    .sort((a, b) => b.visitCount - a.visitCount);
};
