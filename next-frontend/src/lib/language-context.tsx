'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { TRANSLATIONS } from './translations';

export { TRANSLATIONS };

export interface LanguageInfo {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export const LANGUAGES: Record<string, LanguageInfo> = {
  en: { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  hi: { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', flag: '🇮🇳' },
  gu: { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳' },
  mr: { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🇮🇳' },
  ta: { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
};

interface LanguageContextType {
  currentLanguage: string;
  changeLanguage: (lang: string) => void;
  t: (key: string, fallback?: string, params?: Record<string, string | number>) => string;
  languages: Record<string, LanguageInfo>;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentLanguage, setCurrentLanguage] = useState<string>('en');
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('passwala_lang');
    if (saved && LANGUAGES[saved]) {
      setCurrentLanguage(saved);
    }
  }, []);

  const changeLanguage = (lang: string) => {
    if (LANGUAGES[lang]) {
      setCurrentLanguage(lang);
      if (typeof window !== 'undefined') {
        localStorage.setItem('passwala_lang', lang);
      }
    }
  };

  const t = (key: string, fallback?: string, params?: Record<string, string | number>): string => {
    let text = (TRANSLATIONS[currentLanguage] && TRANSLATIONS[currentLanguage][key])
      || (TRANSLATIONS.en && TRANSLATIONS.en[key])
      || fallback
      || key;

    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }

    return text;
  };

  return (
    <LanguageContext.Provider value={{ currentLanguage, changeLanguage, t, languages: LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      currentLanguage: 'en',
      changeLanguage: () => {},
      t: (key: string, fallback?: string, params?: Record<string, string | number>) => {
        let text = TRANSLATIONS.en[key] || fallback || key;
        if (params) {
          Object.entries(params).forEach(([k, v]) => {
            text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
          });
        }
        return text;
      },
      languages: LANGUAGES,
    };
  }
  return context;
};
