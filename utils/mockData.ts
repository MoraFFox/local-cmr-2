import { FormData, Branch, Barista, Contact, MaintenanceRecord } from '../types';
import { partsList, servicesList } from '../constants';

export const generateMockWizardData = (): FormData => {
  return {
    companyName: "قهوة الصباح ذ.م.م",
    email: "info@sabahcoffee.com",
    taxNumber: "300456789",
    location: "القاهرة، مدينة نصر، شارع عباس العقاد",
    hasBranches: true,
    usesOurMachines: true,
    machineOwnershipType: "leased",
    dailyLeaseCost: 150,
    branchCount: 2,
    branches: [
      {
        id: Date.now() + 1,
        location: "التجمع الخامس، شارع التسعين",
        baristaCount: 2,
        baristas: [
          { id: Date.now() + 2, name: "أحمد محمد", rating: 4, comments: "ممتاز في اللاتيه آرت" },
          { id: Date.now() + 3, name: "محمود علي", rating: 3, comments: "يحتاج تدريب على معايرة الطاحونة" }
        ],
        maintenanceHistory: []
      },
      {
        id: Date.now() + 4,
        location: "الزمالك، شارع 26 يوليو",
        baristaCount: 1,
        baristas: [
          { id: Date.now() + 5, name: "كريم حسن", rating: 5, comments: "خبير في الماكينة" }
        ],
        maintenanceHistory: []
      }
    ],
    warehouse: {
      location: "العبور، المنطقة الصناعية",
      contacts: [
        { id: Date.now() + 6, name: "سيد عبد الله", position: "امين مخزن", phoneNumbers: [{ id: Date.now() + 7, number: "01001234567" }] }
      ]
    },
    baristas: [], // Only used if no branches
    maintenanceHistory: [], // Only used if no branches
    contacts: [
      { id: Date.now() + 8, name: "طارق سليم", position: "مدير", phoneNumbers: [{ id: Date.now() + 9, number: "01123456789" }] },
      { id: Date.now() + 10, name: "منى سعيد", position: "محاسب", phoneNumbers: [{ id: Date.now() + 11, number: "01234567890" }] }
    ]
  };
};

export const generateMockTechnicianStep1 = (companies: any[]) => {
  // Use real company/branch IDs if available so the submission connects correctly in tests
  const company = companies.length > 0 ? companies[0] : { id: "mock-company-id", form_data: { branches: [{ id: "mock-branch-id" }] } };
  const branchId = company.form_data?.branches?.[0]?.id || "mock-branch-id";

  return {
    date: new Date().toISOString().split("T")[0],
    companyId: company.id,
    branchId: branchId,
    visitZone: "cairo" as const,
    clientBaristaName: "أحمد محمد",
    clientBaristaRating: 4
  };
};

export const generateMockTechnicianStep2 = () => {
  return {
    visitType: 'problem' as const,
    hadProblem: true,
    problems: ["تسريب مياه", "عدم انتظام الضغط"],
    servicesPerformed: [
      { name: servicesList[0]?.name || "دورة غسيل الجروبات (أول مرة)", count: 1 },
      { name: servicesList[5]?.name || "تظبيط measure", count: 1 }
    ],
    partsWereReplaced: true,
    partsReplaced: [
      { name: partsList[0]?.name || "جوان", count: 2 },
      { name: partsList[2]?.name || "حساس", count: 1 }
    ],
    machineMaintained: [
      { type: "La Marzocco Linea PB", count: 1 }
    ],
    notes: "تم تغيير الجوانات وضبط الضغط. الماكينة تعمل بكفاءة الآن.",
    paidBy: "client" as const,
    clientSupervisorName: "طارق سليم",
    clientSupervisorPhone: "01123456789"
  };
};
