import i18n, { DEFAULT_LANGUAGE, RTL_LANGUAGES } from './index';

export const languageOptions = [
  { code: 'ar', short: 'AR', label: 'العربية', nativeName: 'العربية' },
  { code: 'fr', short: 'FR', label: 'Français', nativeName: 'Français' },
  { code: 'en', short: 'EN', label: 'English', nativeName: 'English' },
];

export function normalizeLanguage(language) {
  const code = String(language || DEFAULT_LANGUAGE).split('-')[0].toLowerCase();
  return languageOptions.some(option => option.code === code) ? code : DEFAULT_LANGUAGE;
}

export function isRTL(language = i18n.resolvedLanguage || i18n.language) {
  return RTL_LANGUAGES.includes(normalizeLanguage(language));
}

export function changeLanguage(language) {
  return i18n.changeLanguage(normalizeLanguage(language));
}

export function getCurrentLanguage() {
  return normalizeLanguage(i18n.resolvedLanguage || i18n.language);
}

export function tt(key, options) {
  return i18n.t(key, options);
}

export function translateApiError(error, fallbackKey = 'errors.generic') {
  const message = error?.response?.data?.message || error?.message;
  return message || i18n.t(fallbackKey);
}
