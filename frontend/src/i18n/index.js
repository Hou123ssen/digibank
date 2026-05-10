import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import frCommon from '../locales/fr/common.json';
import frDashboard from '../locales/fr/dashboard.json';
import frKyc from '../locales/fr/kyc.json';
import frTickets from '../locales/fr/tickets.json';
import frNotifications from '../locales/fr/notifications.json';
import frSettings from '../locales/fr/settings.json';
import frAuth from '../locales/fr/auth.json';

import enCommon from '../locales/en/common.json';
import enDashboard from '../locales/en/dashboard.json';
import enKyc from '../locales/en/kyc.json';
import enTickets from '../locales/en/tickets.json';
import enNotifications from '../locales/en/notifications.json';
import enSettings from '../locales/en/settings.json';
import enAuth from '../locales/en/auth.json';

import arCommon from '../locales/ar/common.json';
import arDashboard from '../locales/ar/dashboard.json';
import arKyc from '../locales/ar/kyc.json';
import arTickets from '../locales/ar/tickets.json';
import arNotifications from '../locales/ar/notifications.json';
import arSettings from '../locales/ar/settings.json';
import arAuth from '../locales/ar/auth.json';

export const DEFAULT_LANGUAGE = 'fr';
export const LANGUAGE_STORAGE_KEY = 'digibank_language';
export const RTL_LANGUAGES = ['ar'];

const resources = {
  fr: { common: frCommon, dashboard: frDashboard, kyc: frKyc, tickets: frTickets, notifications: frNotifications, settings: frSettings, auth: frAuth },
  en: { common: enCommon, dashboard: enDashboard, kyc: enKyc, tickets: enTickets, notifications: enNotifications, settings: enSettings, auth: enAuth },
  ar: { common: arCommon, dashboard: arDashboard, kyc: arKyc, tickets: arTickets, notifications: arNotifications, settings: arSettings, auth: arAuth },
};

export function applyLanguageDirection(language = DEFAULT_LANGUAGE) {
  const normalized = String(language).split('-')[0];
  const isRtl = RTL_LANGUAGES.includes(normalized);

  document.documentElement.lang = normalized;
  document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
  document.body.dir = isRtl ? 'rtl' : 'ltr';
  document.body.classList.toggle('rtl', isRtl);
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: ['fr', 'en', 'ar'],
    ns: ['common', 'dashboard', 'kyc', 'tickets', 'notifications', 'settings', 'auth'],
    defaultNS: 'common',
    fallbackNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ['localStorage'],
    },
    react: {
      useSuspense: false,
    },
    missingKeyHandler: (lngs, ns, key) => {
      if (import.meta.env.DEV) {
        console.warn(`[i18n] Missing translation: ${ns}:${key}`, lngs);
      }
    },
    saveMissing: import.meta.env.DEV,
  });

applyLanguageDirection(i18n.resolvedLanguage || i18n.language || DEFAULT_LANGUAGE);

i18n.on('languageChanged', (language) => {
  const normalized = String(language).split('-')[0];
  localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
  applyLanguageDirection(normalized);
});

export default i18n;
