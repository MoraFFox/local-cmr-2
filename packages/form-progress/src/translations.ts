/**
 * Default Arabic translations for the form-progress package.
 *
 * These strings are used when no custom translations are supplied, which makes
 * the components work out of the box for Arabic-first form wizards.
 */

export interface FormProgressTranslations {
  formProgress: string;
  sections: string;
  completed: string;
  of: string;
  current: string;
  notStarted: string;
  requiredFields: string;
  jumpToNextIncomplete: string;
  jumpToNextIncompleteShortcut: string;
}

export interface RequiredFieldTranslations {
  required: string;
  requiredField: string;
  requiredFieldTitle: string;
}

export interface FormProgressPackageTranslations {
  formProgress: FormProgressTranslations;
  requiredField: RequiredFieldTranslations;
}

export const defaultArabicTranslations: FormProgressPackageTranslations = {
  formProgress: {
    formProgress: 'تقدم النموذج',
    sections: 'الأقسام',
    completed: 'مكتمل',
    of: 'من',
    current: 'الحالي',
    notStarted: 'لم يبدأ',
    requiredFields: 'الحقول المطلوبة',
    jumpToNextIncomplete: 'الانتقال للقسم التالي غير المكتمل',
    jumpToNextIncompleteShortcut: 'Alt + J',
  },
  requiredField: {
    required: 'مطلوب',
    requiredField: 'حقل مطلوب',
    requiredFieldTitle: 'هذا الحقل مطلوب / هذا الحقل مطلوب',
  },
};
