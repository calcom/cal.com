import { createInstance } from "i18next";

import { WEBAPP_URL } from "@calcom/lib/constants";

const translationCache = new Map<string, Record<string, string>>();
const i18nInstanceCache = new Map<string, any>();
const SUPPORTED_NAMESPACES = ["common"];
const SUPPORTED_LOCALES = [
  "ar",
  "az",
  "bg",
  "bn",
  "ca",
  "cs",
  "da",
  "de",
  "el",
  "en",
  "es",
  "es-419",
  "eu",
  "et",
  "fi",
  "fr",
  "he",
  "hu",
  "it",
  "ja",
  "km",
  "ko",
  "nl",
  "no",
  "pl",
  "pt-BR",
  "pt",
  "ro",
  "ru",
  "sk-SK",
  "sr",
  "sv",
  "tr",
  "uk",
  "vi",
  "zh-CN",
  "zh-TW",
];

/**
 * Loads translations for a specific locale and namespace with optimized caching
 * @param {string} _locale - The locale code (e.g., 'en', 'fr', 'zh')
 * @param {string} ns - The namespace for the translations
 * @returns {Promise<Record<string, string>>} Translations object or fallback translations on failure
 */
export async function loadTranslations(_locale: string, _ns: string) {
  let locale = _locale === "zh" ? "zh-CN" : _locale;
  locale = SUPPORTED_LOCALES.includes(locale) ? locale : "en";
  const ns = SUPPORTED_NAMESPACES.includes(_ns) ? _ns : "common";
  const cacheKey = `${locale}-${ns}`;

  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  const url = `${WEBAPP_URL}/static/locales/${locale}/${ns}.json`;
  const response = await fetch(url, {
    cache: process.env.NODE_ENV === "production" ? "force-cache" : "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch translations: ${response.status}`);
  }

  const translations = await response.json();
  translationCache.set(cacheKey, translations);
  return translations;
}

/**
 * Creates or retrieves a cached i18next translation function for the specified locale and namespace
 * @param {string} locale - The locale code (e.g., 'en', 'fr')
 * @param {string} ns - The namespace for the translations
 * @returns {Promise<Function>} A translation function bound to the specified locale and namespace
 */
export const getTranslation = async (locale: string, ns: string) => {
  const cacheKey = `${locale}-${ns}`;
  if (i18nInstanceCache.has(cacheKey)) {
    return i18nInstanceCache.get(cacheKey).getFixedT(locale, ns);
  }

  const resources = await loadTranslations(locale, ns);

  const _i18n = createInstance();
  _i18n.init({
    lng: locale,
    resources: {
      [locale]: {
        [ns]: resources,
      },
    },
    fallbackLng: "en",
  });

  // Cache the i18n instance
  i18nInstanceCache.set(cacheKey, _i18n);
  return _i18n.getFixedT(locale, ns);
};
