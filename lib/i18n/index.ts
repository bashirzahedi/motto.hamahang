import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import fa from './locales/fa.json';
import en from './locales/en.json';

const LANGUAGE_KEY = 'hamahang_language';

export type AppLanguage = 'fa' | 'en';

export async function getStoredLanguage(): Promise<AppLanguage> {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (stored === 'en' || stored === 'fa') return stored;
  } catch {}
  return 'fa';
}

export async function setStoredLanguage(lang: AppLanguage): Promise<void> {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  } catch {}
}

export async function initI18n(): Promise<void> {
  const lng = await getStoredLanguage();

  await i18n.use(initReactI18next).init({
    lng,
    fallbackLng: 'fa',
    resources: {
      fa: { translation: fa },
      en: { translation: en },
    },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

export default i18n;
