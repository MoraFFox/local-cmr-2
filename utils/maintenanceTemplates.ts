import { MaintenanceRecord, PartRecord, ServiceRecord } from "../types";

// Template definitions for common maintenance scenarios
export interface MaintenanceTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  defaultValues: Partial<MaintenanceRecord>;
}

export const maintenanceTemplates: MaintenanceTemplate[] = [
  {
    id: "routine-cleaning",
    name: "Routine Cleaning",
    description: "Standard cleaning and maintenance visit",
    icon: "sparkles",
    defaultValues: {
      type: "scheduled",
      hadProblem: false,
      partsWereReplaced: false,
      problemSolved: true,
      servicesPerformed: [
        { name: "دورة غسيل الجروبات (أول مرة)", count: 1, cost: 500 },
        { name: "تنظيف شاورات", count: 1, cost: 400 },
      ],
      problems: [],
      partsReplaced: [],
      paidBy: "company",
    },
  },
  {
    id: "gasket-replacement",
    name: "Gasket Replacement",
    description: "Replace worn gaskets and seals",
    icon: "wrench",
    defaultValues: {
      type: "requested",
      hadProblem: true,
      partsWereReplaced: true,
      problemSolved: true,
      problems: ["تحتاج الى جوانات"],
      partsReplaced: [{ name: "جوان", count: 2, cost: 100 }],
      servicesPerformed: [{ name: "تغيير جوانات", count: 1, cost: 400 }],
      paidBy: "client",
    },
  },
  {
    id: "shower-replacement",
    name: "Shower Screen Replacement",
    description: "Replace shower screens and related parts",
    icon: "droplet",
    defaultValues: {
      type: "requested",
      hadProblem: true,
      partsWereReplaced: true,
      problemSolved: true,
      problems: ["تحتاج الى شاورات"],
      partsReplaced: [{ name: "شاور", count: 1, cost: 300 }],
      servicesPerformed: [{ name: "تغيير شاورات", count: 1, cost: 400 }],
      paidBy: "client",
    },
  },
  {
    id: "pump-replacement",
    name: "Pump Replacement",
    description: "Replace malfunctioning pump",
    icon: "activity",
    defaultValues: {
      type: "requested",
      hadProblem: true,
      partsWereReplaced: true,
      problemSolved: true,
      problems: ["تسريب مياة"],
      partsReplaced: [{ name: "طرمبه", count: 1, cost: 4500 }],
      servicesPerformed: [{ name: "تغيير طرمبة", count: 1, cost: 500 }],
      paidBy: "client",
    },
  },
  {
    id: "sensor-replacement",
    name: "Sensor Replacement",
    description: "Replace faulty sensors",
    icon: "cpu",
    defaultValues: {
      type: "requested",
      hadProblem: true,
      partsWereReplaced: true,
      problemSolved: true,
      problems: ["ضغط الماكينة غير منضبط"],
      partsReplaced: [{ name: "حساس", count: 1, cost: 450 }],
      servicesPerformed: [{ name: "تغيير حساس", count: 1, cost: 500 }],
      paidBy: "client",
    },
  },
  {
    id: "heater-replacement",
    name: "Heater Replacement",
    description: "Replace heating element",
    icon: "flame",
    defaultValues: {
      type: "requested",
      hadProblem: true,
      partsWereReplaced: true,
      problemSolved: true,
      problems: ["درجة حرارة الماكينة منخفضة"],
      partsReplaced: [{ name: "هيتر", count: 1, cost: 3000 }],
      servicesPerformed: [{ name: "تغيير heater", count: 1, cost: 1500 }],
      paidBy: "client",
    },
  },
  {
    id: "water-leak",
    name: "Water Leak Repair",
    description: "Fix water leakage issues",
    icon: "droplet",
    defaultValues: {
      type: "requested",
      hadProblem: true,
      partsWereReplaced: true,
      problemSolved: true,
      problems: ["تسريب مياة"],
      partsReplaced: [],
      servicesPerformed: [],
      paidBy: "client",
    },
  },
  {
    id: "pressure-issue",
    name: "Pressure Adjustment",
    description: "Adjust machine pressure settings",
    icon: "gauge",
    defaultValues: {
      type: "requested",
      hadProblem: true,
      partsWereReplaced: false,
      problemSolved: true,
      problems: ["ضغط الماكينة غير منضبط"],
      partsReplaced: [],
      servicesPerformed: [{ name: "ضبط الطحنة", count: 1, cost: 200 }],
      paidBy: "company",
    },
  },
];

// Smart defaults based on common patterns
export interface SmartDefaults {
  frequentlyReplacedParts: string[];
  commonProblems: string[];
  commonServices: string[];
  defaultVisitZone: "cairo" | "outside_cairo" | "el_sahel";
  defaultPaidBy: "company" | "client";
}

export const smartDefaults: SmartDefaults = {
  frequentlyReplacedParts: [
    "جوان",
    "شاور",
    "حساس",
    "كابستور",
    "زرار مطحنة",
    "زرار ماكينه عادى",
  ],
  commonProblems: [
    "هاندات غير نظيفة",
    "تحتاج الى شاورات",
    "تحتاج الى جوانات",
    "نسبة الملح عالية",
    "ضغط الماكينة غير منضبط",
    "تسريب مياة",
  ],
  commonServices: [
    "دورة غسيل الجروبات (أول مرة)",
    "تنظيف شاورات",
    "ضبط الطحنة",
    "تغيير جوانات",
    "تغيير شاورات",
  ],
  defaultVisitZone: "cairo",
  defaultPaidBy: "company",
};

// Apply template to create a new maintenance record
export const applyTemplate = (
  templateId: string,
  baseRecord: Partial<MaintenanceRecord> = {},
): Partial<MaintenanceRecord> => {
  const template = maintenanceTemplates.find((t) => t.id === templateId);

  if (!template) {
    return baseRecord;
  }

  return {
    ...baseRecord,
    ...template.defaultValues,
    // Deep clone arrays to prevent shared references
    problems: [...(template.defaultValues.problems || [])],
    partsReplaced: (template.defaultValues.partsReplaced || []).map(p => ({...p})),
    servicesPerformed: (template.defaultValues.servicesPerformed || []).map(s => ({...s})),
    machines: (template.defaultValues.machines || []).map(m => ({...m})),
    followUpVisits: [],
  };
};

// Get template suggestions based on selected problems
export const getSuggestedTemplates = (
  problems: string[],
): MaintenanceTemplate[] => {
  if (!problems || problems.length === 0) {
    return [];
  }

  const problemKeywords: Record<string, string[]> = {
    "gasket-replacement": ["جوان", "gasket", "seal"],
    "shower-replacement": ["شاور", "shower"],
    "pump-replacement": ["طرمبه", "pump", "تسريب"],
    "sensor-replacement": ["حساس", "sensor", "ضغط"],
    "heater-replacement": ["هيتر", "heater", "حراره", "temperature"],
    "water-leak": ["تسريب", "leak", "مياه"],
    "pressure-issue": ["ضغط", "pressure"],
  };

  const suggestions: MaintenanceTemplate[] = [];
  const addedIds = new Set<string>();

  problems.forEach((problem) => {
    const lowerProblem = problem.toLowerCase();

    Object.entries(problemKeywords).forEach(([templateId, keywords]) => {
      if (
        keywords.some((keyword) => lowerProblem.includes(keyword.toLowerCase()))
      ) {
        const template = maintenanceTemplates.find((t) => t.id === templateId);
        if (template && !addedIds.has(templateId)) {
          suggestions.push(template);
          addedIds.add(templateId);
        }
      }
    });
  });

  return suggestions;
};

// Auto-fill suggestions based on previous records
export const getAutoFillSuggestions = (
  currentRecord: Partial<MaintenanceRecord>,
  previousRecords: MaintenanceRecord[],
): Partial<MaintenanceRecord> => {
  if (!previousRecords || previousRecords.length === 0) {
    return {};
  }

  // Get the most recent record with similar characteristics
  const recentRecord = previousRecords[previousRecords.length - 1];

  const suggestions: Partial<MaintenanceRecord> = {};

  // Suggest barista if not set
  if (!currentRecord.baristaName && recentRecord.baristaName) {
    suggestions.baristaName = recentRecord.baristaName;
  }

  // Suggest visit zone if not set
  if (!currentRecord.visitZone && recentRecord.visitZone) {
    suggestions.visitZone = recentRecord.visitZone;
  }

  // Suggest paid by if not set
  if (!currentRecord.paidBy && recentRecord.paidBy) {
    suggestions.paidBy = recentRecord.paidBy;
  }

  // Suggest daily lease cost if not set
  if (!currentRecord.dailyLeaseCost && recentRecord.dailyLeaseCost) {
    suggestions.dailyLeaseCost = recentRecord.dailyLeaseCost;
  }

  return suggestions;
};

// Calculate estimated cost for a record
export const calculateEstimatedCost = (
  record: Partial<MaintenanceRecord>,
): number => {
  let total = 0;

  // Add parts cost
  if (record.partsReplaced) {
    total += record.partsReplaced.reduce((sum, part) => {
      return sum + (part.cost || 0) * part.count;
    }, 0);
  }

  // Add services cost
  if (record.servicesPerformed) {
    total += record.servicesPerformed.reduce((sum, service) => {
      return sum + (service.cost || 0) * service.count;
    }, 0);
  }

  // Add visit zone fee
  if (record.visitZone) {
    const zoneFees: Record<string, number> = {
      cairo: 500,
      outside_cairo: 1500,
      el_sahel: 4000,
    };
    total += zoneFees[record.visitZone] || 0;
  }

  return total;
};
