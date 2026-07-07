import { FormData, Branch, Barista, Contact, MaintenanceRecord } from '../types';
import { partsList, servicesList, problemCategories } from '../constants';

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
    branches: [
      {
        id: Date.now() + 1,
        branchName: "الفرع الرئيسي (التجمع)",
        email: "tagamoa@sabahcoffee.com",
        location: "التجمع الخامس، شارع التسعين",
        baristaCount: 2,
        usesOurMachines: true,
        machineOwnershipType: "leased",
        dailyLeaseCost: 100,
        baristas: [
          { id: Date.now() + 2, name: "أحمد محمد (باريستا)", phone: "01011112222", rating: 4, notes: "ممتاز في اللاتيه آرت والمشروبات الباردة" },
          { id: Date.now() + 3, name: "محمود علي (مساعد)", phone: "01033334444", rating: 3, notes: "يحتاج تدريب على معايرة الطاحونة وضبط الاستخلاص" }
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
              { name: servicesList[0]?.name || "دورة غسيل الجروبات (أول مرة)", count: 2 },
              { name: "خدمة مخصصة: تنظيف مطحنة خارجي", count: 1, cost: 200, paidByClient: true }
            ],
            partsReplaced: [
              { name: partsList[0]?.name || "جوان", count: 2 },
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
        baristaCount: 1,
        usesOurMachines: false,
        machineOwnershipType: "bought",
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
    visitZone: "el_sahel" as const,
    clientBaristaName: "حسام الدين (عميل)",
    clientBaristaRating: 2 // Show low rating to trigger concerns
  };
};

export const generateMockTechnicianStep2 = () => {
  return {
    visitType: 'problem' as const,
    hadProblem: true,
    problems: [problemCategories[0]?.id || "water_leak", problemCategories[2]?.id || "pressure_issue"],
    servicesPerformed: [
      { name: servicesList[0]?.name || "دورة غسيل الجروبات (أول مرة)", count: 2 },
      { name: servicesList[5]?.name || "تظبيط measure", count: 1 },
      { name: "خدمة مخصصة إضافية", count: 1, cost: 150, paidByClient: true }
    ],
    partsWereReplaced: true,
    partsReplaced: [
      { name: partsList[0]?.name || "جوان", count: 2 },
      { name: partsList[2]?.name || "حساس", count: 1 },
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
