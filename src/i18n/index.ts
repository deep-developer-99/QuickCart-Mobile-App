import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import hi from './locales/hi.json';
import fr from './locales/fr.json';
import ja from './locales/ja.json';

export const supportedLanguages = ['en', 'hi', 'fr', 'ja'] as const;
export type Language = (typeof supportedLanguages)[number];

const LANGUAGE_KEY = '@quickcart_language';

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  resources: { en: { translation: en }, hi: { translation: hi }, fr: { translation: fr }, ja: { translation: ja } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export const restoreLanguage = async () => {
  const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
  if (saved && supportedLanguages.includes(saved as Language)) {
    await i18n.changeLanguage(saved);
  }
};

export const changeLanguage = async (language: Language) => {
  await i18n.changeLanguage(language);
  await AsyncStorage.setItem(LANGUAGE_KEY, language);
};

export default i18n;
