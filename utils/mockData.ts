import { FormData, Branch, Barista, Contact, MaintenanceRecord, PartRecord, ServiceRecord, Supervisor, MachineMaintained } from '../types';
import { partsList, servicesList, problemCategories } from '../constants';
import { getAllVisitZones } from './visitZones';

// Reusable pools of realistic Arabic dummy values
const technicianNames = [
  "أحمد محمود", "محمد علي", "خالد عمر", "سامي حسن", "طارق سالم",
  "وليد فؤاد", "ياسر عبد الله", "إبراهيم نور", "هيثم رفعت", "كريم سعيد"
];

const clientBaristaNames = [
  "محمد العميل", "أحمد العميل", "يوسف العميل", "كريم العميل", "خالد العميل",
  "عمرو العميل", "سامح العميل", "نادر العميل"
];

const machineNames = [
  "La Marzocco Linea PB", "La Marzocco GS3", "Nuova Simonelli Appia II",
  "Victoria Arduino Eagle One", "Mazzer Robur S", "Mazzer Major E"
];

const recommendationTexts = [
  "يفضل تغيير فلتر المياه خلال الزيارة القادمة.",
  "ضبط الطحنة مرة أخرى بعد أسبوع.",
  "مراجعة ضغط البويلر باستمرار.",
  "تنظيف الشاورات بشكل دوري.",
  "تغيير جوانات الجروب كل 3 أشهر.",
  "الماكينة تحتاج صيانة دورية متقدمة.",
];

const notesTexts = [
  "زيارة دورية: غسيل وتعقيم الماكينة.",
  "تم فحص الماكينة وإجراء الضبط اللازم.",
  "العميل أبلغ عن بطء في التسخين.",
  "تم تغيير القطع التالفة واختبار الماكينة.",
  "المشكلة ظاهرية وتم حلها.",
  "تحتاج متابعة بالزيارة القادمة.",
];

function pickRandom<T>(arr: T[], count: number = 1): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomBoolean(chance: number = 0.5): boolean {
  return Math.random() < chance;
}

function randomDateInPast(daysBack: number = 90): string {
  const date = new Date();
  date.setDate(date.getDate() - randomInt(1, daysBack));
  return date.toISOString().split('T')[0];
}

function randomDateInFuture(daysForward: number = 90): string {
  const date = new Date();
  date.setDate(date.getDate() + randomInt(1, daysForward));
  return date.toISOString().split('T')[0];
}

/**
 * Generate a fully populated, realistic maintenance record.
 * Useful for development / QA when adding a new record.
 */
export const generateMockMaintenanceRecord = (
  id: number | string,
  opts: {
    partsList?: { label: string; value: string; cost: number }[];
    servicesList?: { label: string; value: string; cost: number }[];
    problemCategories?: { title: string; options: { label: string; value: string }[] }[];
    availableBaristas?: { name: string }[];
    availableClientBaristas?: { name: string }[];
  } = {}
): MaintenanceRecord => {
  const parts = opts.partsList && opts.partsList.length > 0 ? opts.partsList : [];
  const services = opts.servicesList && opts.servicesList.length > 0 ? opts.servicesList : [];
  const allProblems = (opts.problemCategories || problemCategories)
    .flatMap((cat) => cat.options)
    .map((o) => o.value);

  const hadProblem = randomBoolean(0.6);
  const problems = hadProblem ? pickRandom(allProblems, randomInt(1, 3)) : [];
  const problemSolved = hadProblem ? randomBoolean(0.7) : false;
  const partsWereReplaced = randomBoolean(0.5);
  const servicesCount = randomInt(1, 4);
  const servicesPerformed: ServiceRecord[] = pickRandom(services, servicesCount).map((s) => ({
    name: s.value,
    count: randomInt(1, 3),
    cost: s.cost,
    paidByClient: randomBoolean(0.3),
  }));

  const partsReplaced: PartRecord[] = partsWereReplaced
    ? pickRandom(parts, randomInt(1, 3)).map((p) => ({
        name: p.value,
        count: randomInt(1, 3),
        cost: p.cost,
        paidByClient: randomBoolean(0.3),
      }))
    : [];

  const baristaName =
    opts.availableBaristas && opts.availableBaristas.length > 0
      ? pickRandom(opts.availableBaristas, 1)[0].name
      : pickRandom(technicianNames, 1)[0];

  const clientBaristaName =
    opts.availableClientBaristas && opts.availableClientBaristas.length > 0
      ? pickRandom(opts.availableClientBaristas, 1)[0].name
      : pickRandom(clientBaristaNames, 1)[0];

  const zoneKeys = getAllVisitZones().map(z => z.key);
  const zones: (string | null)[] = [...zoneKeys, null];
  const visitZone = pickRandom(zones, 1)[0];
  const paidBy = randomBoolean(0.5) ? "company" : "client";

  const supervisors: Supervisor[] = [
    {
      id: Date.now(),
      name: pickRandom(technicianNames, 1)[0],
      phone: `01${randomInt(100000000, 999999999)}`,
    },
  ];

  const machines: MachineMaintained[] = pickRandom(machineNames, randomInt(1, 2)).map(
    (name, idx) => ({
      id: Date.now() + idx,
      name,
      count: randomInt(1, 2),
    })
  );

  const photoCount = randomInt(0, 2);
  const photos = pickRandom(
    [
      { url: 'https://placehold.co/600x400?text=Before', type: 'before' as const },
      { url: 'https://placehold.co/600x400?text=After', type: 'after' as const },
      { url: 'https://placehold.co/600x400?text=Legacy', type: 'legacy' as const },
    ],
    photoCount
  );

  return {
    id,
    maintenanceDate: randomDateInPast(60),
    notes: pickRandom(notesTexts, 1)[0],
    type: randomBoolean(0.5) ? "scheduled" : "requested",
    hadProblem,
    partsWereReplaced,
    problemSolved,
    partsReplaced,
    paidBy,
    baristaName,
    clientBaristaName,
    visitRating: randomInt(1, 5),
    recommendations: pickRandom(recommendationTexts, 1)[0],
    problems,
    visitZone,
    servicesPerformed,
    followUpVisits: [],
    machines,
    supervisors,
    dailyLeaseCost: randomBoolean(0.5) ? randomInt(100, 300) : undefined,
    nextVisitDate: randomBoolean(0.4) ? randomDateInFuture(60) : undefined,
    photos,
  };
};

// Deep mock generator targeting edge-case coverage
export const generateMockWizardData = (): FormData => {
  return {
    companyName: "قهوة الصباح ذ.م.م - فرع تجريبي",
    email: "info@sabahcoffee.com",
    taxNumber: "300-456-789",
    location: "القاهرة، التجمع الخامس، مجمع البنوك",
    hasBranches: true,
    usesOurMachines: true,
    machineOwnershipType: "leased",
    dailyLeaseCost: 150,
    branchCount: 2,
    machines: [],
    branches: [
      {
        id: Date.now() + 1,
        branchName: "الفرع الرئيسي (التجمع)",
        email: "tagamoa@sabahcoffee.com",
        location: "التجمع الخامس، شارع التسعين",
        usesOurMachines: true,
        machineOwnershipType: "leased",
        dailyLeaseCost: 100,
        machines: [],
        baristas: [
          { id: Date.now() + 2, name: "أحمد محمد (باريستا)", phone: "01011112222", notes: "ممتاز في اللاتيه آرت والمشروبات الباردة" },
          { id: Date.now() + 3, name: "محمود علي (مساعد)", phone: "01033334444", notes: "يحتاج تدريب على معايرة الطاحونة وضبط الاستخلاص" }
        ],
        clientBaristas: [
          { id: Date.now() + 4, name: "يوسف العميل", phone: "01199998888", notes: "مسؤول الشفت المسائي" }
        ],
        contacts: [
          { id: Date.now() + 5, name: "سعيد مدير الفرع", position: "مدير", phoneNumbers: [{ id: Date.now() + 6, number: "01212121212" }] }
        ],
        maintenanceHistory: [
          {
            id: Date.now() + 7,
            maintenanceDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            type: "scheduled",
            hadProblem: false,
            problemSolved: true,
            partsWereReplaced: true,
            paidBy: "company",
            baristaName: "فني الصيانة الافتراضي",
            clientBaristaName: "يوسف العميل",
            visitRating: 4,
            visitZone: "cairo",
            notes: "زيارة دورية: غسيل الماكينة وتغيير جوانات وقائية.",
            recommendations: "يفضل تركيب فلتر مياه جديد الزيارة القادمة",
            servicesPerformed: [
              { name: servicesList[0]?.label || "دورة غسيل الجروبات (أول مرة)", count: 2 },
              { name: "خدمة مخصصة: تنظيف مطحنة خارجي", count: 1, cost: 200, paidByClient: true }
            ],
            partsReplaced: [
              { name: partsList[0]?.label || "جوان", count: 2 },
              { name: "قطعة مخصصة: شبكة جروب", count: 1, cost: 450, paidByClient: true }
            ],
            supervisors: [
              { id: Date.now() + 8, name: "سعيد مدير الفرع", phone: "01212121212" }
            ],
            machines: [
              { id: Date.now() + 9, name: "La Marzocco Linea PB", count: 1 }
            ]
          }
        ]
      },
      {
        id: Date.now() + 10,
        branchName: "فرع الزمالك",
        email: "zamalek@sabahcoffee.com",
        location: "الزمالك، شارع 26 يوليو",
        usesOurMachines: false,
        machineOwnershipType: "bought",
        machines: [],
        baristas: [],
        clientBaristas: [
          { id: Date.now() + 11, name: "كريم حسن", phone: "01055556666", notes: "يمتلك ماكينته الخاصة" }
        ],
        contacts: [],
        maintenanceHistory: [
          {
            id: Date.now() + 12,
            maintenanceDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            type: "requested",
            hadProblem: true,
            problems: ["تسريب مياه", "صوت عالي من المضخة"],
            problemSolved: false,
            partsWereReplaced: false,
            paidBy: "client",
            baristaName: "فني طوارئ",
            clientBaristaName: "كريم حسن",
            visitZone: "cairo",
            notes: "المضخة تحتاج تغيير. القطعة غير متوفرة حالياً.",
            recommendations: "يجب إيقاف الماكينة حتى تغيير المضخة.",
            servicesPerformed: [],
            partsReplaced: [],
            supervisors: [],
            machines: [
              { id: Date.now() + 13, name: "Simonelli Appia II", count: 1 }
            ],
            nextVisitDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          }
        ]
      }
    ],
    warehouse: {
      location: "العبور، المنطقة الصناعية (بلوك 4)",
      contacts: [
        { id: Date.now() + 14, name: "عبد الله المخازن", position: "امين مخزن", phoneNumbers: [{ id: Date.now() + 15, number: "01001234567" }, { id: Date.now() + 16, number: "01111222233" }] }
      ]
    },
    baristas: [],
    maintenanceHistory: [],
    contacts: [
      { id: Date.now() + 17, name: "طارق سليم (المالك)", position: "مدير", phoneNumbers: [{ id: Date.now() + 18, number: "01123456789" }] },
      { id: Date.now() + 19, name: "منى سعيد", position: "محاسب", phoneNumbers: [{ id: Date.now() + 20, number: "01234567890" }] },
      { id: Date.now() + 21, name: "خالد صيانة", position: "custom", customPosition: "مهندس صيانة خارجي", phoneNumbers: [{ id: Date.now() + 22, number: "01555555555" }] }
    ]
  };
};

export const generateMockTechnicianStep1 = (companies: any[]) => {
  const company = companies.length > 0 ? companies[0] : { id: "mock-company-id", form_data: { branches: [{ id: "mock-branch-id" }] } };
  const branchId = company.form_data?.branches?.[0]?.id || "mock-branch-id";

  return {
    date: new Date().toISOString().split("T")[0],
    companyId: company.id,
    branchId: branchId,
    visitZone: "el_sahel",
    clientBaristaName: "حسام الدين (عميل)",
    clientBaristaRating: 2 // Show low rating to trigger concerns
  };
};

export const generateMockTechnicianStep2 = () => {
  return {
    visitType: 'problem' as const,
    hadProblem: true,
    problems: ["water_leak", "pressure_issue"],
    servicesPerformed: [
      { name: servicesList[0]?.label || "دورة غسيل الجروبات (أول مرة)", count: 2 },
      { name: servicesList[5]?.label || "تظبيط measure", count: 1 },
      { name: "خدمة مخصصة إضافية", count: 1, cost: 150, paidByClient: true }
    ],
    partsWereReplaced: true,
    partsReplaced: [
      { name: partsList[0]?.label || "جوان", count: 2 },
      { name: partsList[2]?.label || "حساس", count: 1 },
      { name: "طرمبة ضغط عالي مخصصة", count: 1, cost: 2500, paidByClient: true }
    ],
    machineMaintained: [
      { type: "La Marzocco FB80", count: 1 },
      { type: "Mazzer Robur S", count: 2 }
    ],
    notes: "[تقرير تجريبي] - تم فحص الماكينة بسبب شكوى التسريب. وجد تلف في جوانات الجروب وتراكم أملاح. تم عمل الغسيل وتغيير الجوانات وضبط طاحونة مازر.",
    paidBy: "client" as const,
    clientSupervisorName: "طارق سليم",
    clientSupervisorPhone: "01123456789",
    problemSolved: true,
    photos: [] // Empty array or mock blobs depending on how photos are handled
  };
};
