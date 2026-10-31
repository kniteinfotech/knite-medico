import React, { createContext, useContext, useState, useEffect } from 'react';
import { LANGUAGES, translations, getLocalizedWhatsAppMessage } from './translations';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('knite_language') || 'en';
  });

  const [whatsappLanguage, setWhatsappLanguageState] = useState(() => {
    return localStorage.getItem('knite_wa_language') || localStorage.getItem('knite_language') || 'en';
  });

  function setLanguage(code) {
    if (translations[code]) {
      setLanguageState(code);
      localStorage.setItem('knite_language', code);
      // Auto update WhatsApp language if not customized separately
      if (!localStorage.getItem('knite_wa_language_customized')) {
        setWhatsappLanguageState(code);
        localStorage.setItem('knite_wa_language', code);
      }
    }
  }

  function setWhatsappLanguage(code) {
    if (translations[code]) {
      setWhatsappLanguageState(code);
      localStorage.setItem('knite_wa_language', code);
      localStorage.setItem('knite_wa_language_customized', 'true');
    }
  }

  function t(key, fallback = '') {
    const dict = translations[language] || translations.en;
    if (dict && dict[key] !== undefined) return dict[key];
    if (translations.en && translations.en[key] !== undefined) return translations.en[key];
    return fallback || key;
  }

  function formatWhatsAppBill(options) {
    const langToUse = options.language || whatsappLanguage || language || 'en';
    return getLocalizedWhatsAppMessage({ ...options, language: langToUse });
  }

  return (
    <LanguageContext.Provider value={{
      language,
      setLanguage,
      whatsappLanguage,
      setWhatsappLanguage,
      availableLanguages: LANGUAGES,
      t,
      formatWhatsAppBill
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Graceful fallback if outside provider
    return {
      language: 'en',
      setLanguage: () => {},
      whatsappLanguage: 'en',
      setWhatsappLanguage: () => {},
      availableLanguages: LANGUAGES,
      t: (k, fb) => fb || k,
      formatWhatsAppBill: (opts) => getLocalizedWhatsAppMessage(opts)
    };
  }
  return context;
}
