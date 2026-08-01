import { Part, Service } from './types';
import type { Translations } from './utils/arabicTranslations';

export type ViewKey =
  | "history"
  | "form"
  | "print"
  | "details"
  | "baristas"
  | "barista-details"
  | "maintenance-edit"
  | "technicians"
  | "machines"
  | "logistics-timeline"
  | "all-records";

/** Icon identities available to sidebar navigation items. */
export type SidebarIconName =
  | "ClockIcon"
  | "UsersIcon"
  | "UserGroupIcon"
  | "ClipboardDocumentListIcon"
  | "PlusIcon"
  | "Cog6ToothIcon"
  | "HomeIcon"
  | "DocumentTextIcon";

export interface NavItem {
  key: ViewKey;
  path: string;
  /** Key into the translated `admin.sidebar` namespace. */
  labelKey: keyof Translations['admin']['sidebar'];
  iconName: SidebarIconName;
  inSidebar: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { key: "history", path: "/", labelKey: "history", iconName: "ClockIcon", inSidebar: true },
  { key: "baristas", path: "/baristas", labelKey: "baristas", iconName: "UsersIcon", inSidebar: true },
  { key: "technicians", path: "/users", labelKey: "technicians", iconName: "UserGroupIcon", inSidebar: true },
  { key: "all-records", path: "/records", labelKey: "allRecords", iconName: "ClipboardDocumentListIcon", inSidebar: true },
  { key: "form", path: "/companies/new", labelKey: "newCompany", iconName: "PlusIcon", inSidebar: false },
  { key: "machines", path: "/settings", labelKey: "settings", iconName: "Cog6ToothIcon", inSidebar: true },
  { key: "print", path: "/print", labelKey: "newCompany", iconName: "DocumentTextIcon", inSidebar: false },
];

/**
 * Whether a sidebar navigation item represents the current view.
 * Nested company/barista/settings routes map to their parent sidebar item.
 */
export function isSidebarItemActive(
  item: NavItem,
  view: ViewKey,
  pathname: string,
): boolean {
  if (item.key === "baristas") {
    return view === "baristas" || view === "barista-details";
  }
  if (item.key === "history") {
    return view === "history";
  }
  if (item.key === "machines") {
    return view === "machines" || pathname === "/settings/machines";
  }
  if (item.key === "technicians") return view === "technicians";
  if (item.key === "all-records") return view === "all-records";
  return view === item.key;
}

export const pathToView = (pathname: string): ViewKey => {
  if (pathname === "/") return "history";
  if (pathname === "/records") return "all-records";
  if (pathname.startsWith("/baristas/")) return "barista-details";
  if (pathname === "/baristas") return "baristas";
  if (pathname === "/users") return "technicians";
  // The old /settings/machines URL is kept working for existing bookmarks.
  if (pathname === "/settings" || pathname === "/settings/machines") return "machines";
  if (pathname === "/companies/new") return "form";
  if (pathname === "/print") return "print";
  if (/^\/companies\/[^/]+\/maintenance$/.test(pathname)) return "maintenance-edit";
  if (/^\/companies\/[^/]+\/logistics$/.test(pathname)) return "logistics-timeline";
  if (/^\/companies\/[^/]+$/.test(pathname)) return "details";
  return "history";
};

export const partsList: Part[] = [
  { label: "جوان", value: "جوان", cost: 100, isFrequentlyReplaced: true },
  { label: "شاور", value: "شاور", cost: 300, isFrequentlyReplaced: true },
  { label: "حساس", value: "حساس", cost: 450, isFrequentlyReplaced: true },
  { label: "كابستور", value: "كابستور", cost: 300 },
  { label: "زرار مطحنة", value: "زرار مطحنة", cost: 300 },
  { label: "زرار ماكينه عادى", value: "زرار ماكينه عادى", cost: 300 },
  { label: "زرار ماكينه بريميوم", value: "زرار ماكينه بريميوم", cost: 800 },
  { label: "صنولويد", value: "صنولويد", cost: 3000 },
  { label: "هيتر", value: "هيتر", cost: 3000 },
  { label: "طرمبه", value: "طرمبه", cost: 4500 },
  { label: "بريشر", value: "بريشر", cost: 4500 },
  { label: "زور مطحنه", value: "زور مطحنه", cost: 800 },
  { label: "جوان لامرزوكو", value: "جوان لامرزوكو", cost: 600 },
  { label: "تروس مطحنة", value: "تروس مطحنة", cost: 2000 },
];

export const servicesList: Service[] = [
  // دورات الغسيل والتنظيف
  {
    label: "دورة غسيل الجروبات (أول مرة)",
    value: "دورة غسيل الجروبات (أول مرة)",
    cost: 500,
    category: "دورات الغسيل والتنظيف",
  },
  {
    label: "دورة غسيل الجروبات (إضافي)",
    value: "دورة غسيل الجروبات (إضافي)",
    cost: 250,
    category: "دورات الغسيل والتنظيف",
    description: "لكل جروب إضافي بعد الأول",
  },
  {
    label: "دورة غسيل خزان",
    value: "دورة غسيل خزان",
    cost: 1500,
    category: "دورات الغسيل والتنظيف",
  },
  {
    label: "دورة غسيل سوفتنر بالملح",
    value: "دورة غسيل سوفتنر بالملح",
    cost: 500,
    category: "دورات الغسيل والتنظيف",
  },
  {
    label: "دورة غسيل سوفتنر بالمادة",
    value: "دورة غسيل سوفتنر بالمادة",
    cost: 1500,
    category: "دورات الغسيل والتنظيف",
  },
  {
    label: "تنظيف شاورات",
    value: "تنظيف شاورات",
    cost: 400,
    category: "دورات الغسيل والتنظيف",
  },
  {
    label:"تظيف الصرف",
    value: "تظيف الصرف",
    cost: 200,
    category: "دورات الغسيل والتنظيف",
  },
  {
    label: "تنظيف هاندات",
    value: "تنظيف هاندات",
    cost: 100,
    category: "دورات الغسيل والتنظيف",
  },

  // الضبط والمعايرة
  {
    label: "ضبط الطحنة",
    value: "ضبط الطحنة",
    cost: 200,
    category: "الضبط والمعايرة",
  },
  {
    label: "تظبيط measure",
    value: "تظبيط measure",
    cost: 200,
    category: "الضبط والمعايرة",
  },
  {label: "ضبط الحراره",
    value: "ضبط الحراره",
    cost: 200,
    category: "الضبط والمعايرة",
  },
  {label: "ضبط الضغط",
    value: "ضبط الضغط",
    cost: 300,
    category: "الضبط والمعايرة",
  },

  // رسوم تغيير قطع الغيار
  {
    label: "تغيير جوانات",
    value: "تغيير جوانات",
    cost: 400,
    category: "رسوم تغيير قطع الغيار",
  },
  {
    label: "تغيير طرمبة",
    value: "تغيير طرمبة",
    cost: 500,
    category: "رسوم تغيير قطع الغيار",
  },
  {
    label: "تغيير heater",
    value: "تغيير heater",
    cost: 1500,
    category: "رسوم تغيير قطع الغيار",
  },
  {
    label: "تغيير شاورات",
    value: "تغيير شاورات",
    cost: 400,
    category: "رسوم تغيير قطع الغيار",
  },
  {
    label: "تغيير ماسورة",
    value: "تغيير ماسورة",
    cost: 1000,
    category: "رسوم تغيير قطع الغيار",
  },
  {
    label: "تغيير حنفية مياة",
    value: "تغيير حنفية مياة",
    cost: 500,
    category: "رسوم تغيير قطع الغيار",
  },
  {
    label: "تغيير حساس",
    value: "تغيير حساس",
    cost: 500,
    category: "رسوم تغيير قطع الغيار",
  },
  {
    label: "تغيير زرار ماكينة",
    value: "تغيير زرار ماكينة",
    cost: 300,
    category: "رسوم تغيير قطع الغيار",
  },
  {
    label: "تغيير زرار مطحنة",
    value: "تغيير زرار مطحنة",
    cost: 200,
    category: "رسوم تغيير قطع الغيار",
  },
  {
    label: "تغيير عداد",
    value: "تغيير عداد",
    cost: 400,
    category: "رسوم تغيير قطع الغيار",
  },
  {
    label: "تغيير محبس",
    value: "تغيير محبس",
    cost: 450,
    category: "رسوم تغيير قطع الغيار",
  },
  {
    label: "تغيير هاند ستيم",
    value: "تغيير هاند ستيم",
    cost: 350,
    category: "رسوم تغيير قطع الغيار",
  },

];

export const contactPositions = [
  { label: "مدير", value: "manager" },
  { label: "مدير العمليات", value: "ops_manager" },
  { label: "مدير المشتريات", value: "purchasing_manager" },
  { label: "مسؤول المشتريات", value: "purchasing_officer" },
  { label: "الحسابات", value: "accounting" },
  { label: "الرئيس التنفيذي", value: "chief" },
  { label: "المالك", value: "owner" },
  { label: "العلاقات العامة", value: "pr" },
  { label: "مخصص", value: "custom" },
];

export const problemCategories = [
  {
    title: 'مشاكل عامة',
    options: [
      { label: 'هاندات غير نظيفة', value: 'هاندات غير نظيفة' },
      { label: 'تحتاج الى شاورات', value: 'تحتاج الى شاورات' },
      { label: 'تحتاج الى جوانات', value: 'تحتاج الى جوانات' },
      { label: 'نسبة الملح عالية', value: 'نسبة الملح عالية' },
    ],
  },
  {
    title: 'مشاكل ضغط وحرارة',
    options: [
      { label: 'ضغط الماكينة غير منضبط', value: 'ضغط الماكينة غير منضبط' },
      { label: 'درجة حرارة الماكينة منخفضة', value: 'درجة حرارة الماكينة منخفضة' },
      { label: 'درجة حرارة الماكينة مرتفعة', value: 'درجة حرارة الماكينة مرتفعة' },
    ],
  },
  {
    title: 'مشاكل التسريب',
    options: [
      { label: 'تسريب مياة', value: 'تسريب مياة' },
      { label: 'تسريب بخار', value: 'تسريب بخار' },
      {label: "مشاكل صرف", value: "مشاكل صرف"}
    ],
  },
];
