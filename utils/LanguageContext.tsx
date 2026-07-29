import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ar, type Translations } from './arabicTranslations';
import { en } from './englishTranslations';

export type SupportedLanguage = 'ar' | 'en';
interface LanguageContextValue {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  toggleLanguage: () => void;
  t: Translations;
  dir: 'rtl' | 'ltr';
}

const LANGUAGE_STORAGE_KEY = 'cmr-language';

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getInitialLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') return 'ar';
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === 'en' || stored === 'ar') return stored;
  } catch {
    // localStorage may throw in private browsing, storage-full, or locked-down environments
  }
  return 'ar';
}

function getTranslations(lang: SupportedLanguage): Translations {
  return lang === 'ar' ? ar : en;
}

function getDir(lang: SupportedLanguage): 'rtl' | 'ltr' {
  return lang === 'ar' ? 'rtl' : 'ltr';
}

/** Apply language to DOM and localStorage (single source of truth for side effects). */
function applyLanguage(lang: SupportedLanguage): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  }
  if (typeof document !== 'undefined') {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(getInitialLanguage);

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    setLanguageState(lang);
    applyLanguage(lang);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState(prev => {
      const next = prev === 'ar' ? 'en' : 'ar';
      applyLanguage(next);
      return next;
    });
  }, []);

  // Apply dir/lang to document on initial mount (setLanguage/toggleLanguage handle subsequent changes)
  useEffect(() => {
    applyLanguage(language);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const value: LanguageContextValue = {
    language,
    setLanguage,
    toggleLanguage,
    t: getTranslations(language),
    dir: getDir(language),
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
