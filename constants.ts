import { Part, Service } from './types';

export type ViewKey =
  | "history"
  | "form"
  | "print"
  | "details"
  | "baristas"
  | "barista-details"
  | "maintenance-edit"
  | "technicians";

export interface NavItem {
  key: ViewKey;
  path: string;
  label: string;
  iconName: "HomeIcon" | "UsersIcon" | "UserGroupIcon" | "DocumentTextIcon";
  inSidebar: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { key: "history", path: "/", label: "السجل", iconName: "HomeIcon", inSidebar: true },
  { key: "baristas", path: "/baristas", label: "أداء الباريستا", iconName: "UsersIcon", inSidebar: true },
  { key: "technicians", path: "/users", label: "إدارة الفنيين", iconName: "UserGroupIcon", inSidebar: true },
  { key: "form", path: "/companies/new", label: "إضافة شركة", iconName: "DocumentTextIcon", inSidebar: true },
  { key: "print", path: "/print", label: "طباعة", iconName: "DocumentTextIcon", inSidebar: false },
];

export const pathToView = (pathname: string): ViewKey => {
  if (pathname === "/") return "history";
  if (pathname.startsWith("/baristas/")) return "barista-details";
  if (pathname === "/baristas") return "baristas";
  if (pathname === "/users") return "technicians";
  if (pathname === "/companies/new") return "form";
  if (pathname === "/print") return "print";
  if (/^\/companies\/[^/]+\/maintenance$/.test(pathname)) return "maintenance-edit";
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
  { label: "العلاقات العامة", value: "pr" },
  { label: "المبيعات", value: "sales" },
  { label: "الرئيس التنفيذي", value: "chief" },
  { label: "المالك", value: "owner" },
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
