'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import en from '../../messages/en.json';
import ar from '../../messages/ar.json';

type Locale = 'en' | 'ar';

interface I18nContextType {
  locale: Locale;
  t: (key: string, replacements?: Record<string, string | number>) => string;
  changeLocale: (newLocale: Locale) => void;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children, serverLocale = 'en' }: { children: React.ReactNode; serverLocale?: Locale }) {
  const [locale, setLocale] = useState<Locale>(serverLocale);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    const activeLocale: Locale = pathParts[1] === 'ar' ? 'ar' : 'en';
    if (activeLocale !== locale) {
      setLocale(activeLocale);
    }
    setMounted(true);

    // Apply document direction and lang attributes
    document.documentElement.dir = activeLocale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = activeLocale;
    
    if (activeLocale === 'ar') {
      document.documentElement.classList.add('rtl-layout');
    } else {
      document.documentElement.classList.remove('rtl-layout');
    }
  }, [locale]);

  const changeLocale = (newLocale: Locale) => {
    const pathParts = window.location.pathname.split('/');
    pathParts[1] = newLocale;
    const newPath = pathParts.join('/');
    
    // Set cookie for middleware persistence
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`;
    
    // Redirect to reload the page with new direction and dictionary
    window.location.href = newPath;
  };

  const t = (key: string, replacements?: Record<string, string | number>): string => {
    const dictionary: any = locale === 'ar' ? ar : en;
    const parts = key.split('.');
    let current: any = dictionary;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return key;
      }
    }

    if (typeof current === 'string') {
      let result = current;
      if (replacements) {
        Object.entries(replacements).forEach(([k, v]) => {
          result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        });
      }
      return result;
    }

    return key;
  };

  // Prevent flash of default text before mounting locale preference
  const contextValue = {
    locale,
    t,
    changeLocale,
  };

  return (
    <I18nContext.Provider value={contextValue}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
}
