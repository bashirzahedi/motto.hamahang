import React, { createContext, useContext, useState, useCallback } from 'react';
import { I18nManager, Platform, Alert, DevSettings } from 'react-native';
import i18n from './index';
import { setStoredLanguage, type AppLanguage } from './index';

interface LanguageContextType {
  language: AppLanguage;
  isRTL: boolean;
  changeLanguage: (lang: AppLanguage) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  isRTL: false,
  changeLanguage: async () => {},
});

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<AppLanguage>(
    (i18n.language as AppLanguage) || 'en'
  );

  const isRTL = language === 'fa';

  const changeLanguage = useCallback(async (lang: AppLanguage) => {
    await setStoredLanguage(lang);
    await i18n.changeLanguage(lang);
    setLanguage(lang);

    const newIsRTL = lang === 'fa';

    if (Platform.OS === 'web') {
      document.documentElement.setAttribute('dir', newIsRTL ? 'rtl' : 'ltr');
      document.documentElement.setAttribute('lang', lang);
      window.location.reload();
      return;
    }

    // Native: I18nManager.forceRTL requires app reload
    if (I18nManager.isRTL !== newIsRTL) {
      I18nManager.allowRTL(true);
      I18nManager.forceRTL(newIsRTL);

      try {
        DevSettings.reload();
      } catch {
        Alert.alert(
          lang === 'fa' ? 'ریستارت' : 'Restart',
          lang === 'fa'
            ? 'لطفاً اپ را ببندید و دوباره باز کنید.'
            : 'Please close and reopen the app.'
        );
      }
    }
  }, []);

  return (
    <LanguageContext.Provider value={{ language, isRTL, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}
