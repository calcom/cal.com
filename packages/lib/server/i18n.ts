import { createInstance } from "i18next";

import logger from "../logger";

/* eslint-disable @typescript-eslint/no-var-requires */
const { i18n } = require("@calcom/config/next-i18next.config");

// Import translations directly to avoid HTTP requests
const translations: Record<string, Record<string, any>> = {
  en: require("../../../apps/web/public/static/locales/en/common.json"),
  ar: require("../../../apps/web/public/static/locales/ar/common.json"),
  az: require("../../../apps/web/public/static/locales/az/common.json"),
  bg: require("../../../apps/web/public/static/locales/bg/common.json"),
  bn: require("../../../apps/web/public/static/locales/bn/common.json"),
  ca: require("../../../apps/web/public/static/locales/ca/common.json"),
  cs: require("../../../apps/web/public/static/locales/cs/common.json"),
  da: require("../../../apps/web/public/static/locales/da/common.json"),
  de: require("../../../apps/web/public/static/locales/de/common.json"),
  el: require("../../../apps/web/public/static/locales/el/common.json"),
  es: require("../../../apps/web/public/static/locales/es/common.json"),
  "es-419": require("../../../apps/web/public/static/locales/es-419/common.json"),
  eu: require("../../../apps/web/public/static/locales/eu/common.json"),
  et: require("../../../apps/web/public/static/locales/et/common.json"),
  fi: require("../../../apps/web/public/static/locales/fi/common.json"),
  fr: require("../../../apps/web/public/static/locales/fr/common.json"),
  he: require("../../../apps/web/public/static/locales/he/common.json"),
  hu: require("../../../apps/web/public/static/locales/hu/common.json"),
  it: require("../../../apps/web/public/static/locales/it/common.json"),
  ja: require("../../../apps/web/public/static/locales/ja/common.json"),
  km: require("../../../apps/web/public/static/locales/km/common.json"),
  ko: require("../../../apps/web/public/static/locales/ko/common.json"),
  nl: require("../../../apps/web/public/static/locales/nl/common.json"),
  no: require("../../../apps/web/public/static/locales/no/common.json"),
  pl: require("../../../apps/web/public/static/locales/pl/common.json"),
  pt: require("../../../apps/web/public/static/locales/pt/common.json"),
  "pt-BR": require("../../../apps/web/public/static/locales/pt-BR/common.json"),
  ro: require("../../../apps/web/public/static/locales/ro/common.json"),
  ru: require("../../../apps/web/public/static/locales/ru/common.json"),
  "sk-SK": require("../../../apps/web/public/static/locales/sk-SK/common.json"),
  sr: require("../../../apps/web/public/static/locales/sr/common.json"),
  sv: require("../../../apps/web/public/static/locales/sv/common.json"),
  tr: require("../../../apps/web/public/static/locales/tr/common.json"),
  uk: require("../../../apps/web/public/static/locales/uk/common.json"),
  vi: require("../../../apps/web/public/static/locales/vi/common.json"),
  "zh-CN": require("../../../apps/web/public/static/locales/zh-CN/common.json"),
  "zh-TW": require("../../../apps/web/public/static/locales/zh-TW/common.json"),
};

const translationCache = new Map<string, Record<string, string>>();
const i18nInstanceCache = new Map<string, any>();
const SUPPORTED_NAMESPACES = ["common"];

/**
 * Loads translations for a specific locale and namespace with optimized caching
 * @param {string} _locale - The locale code (e.g., 'en', 'fr', 'zh')
 * @param {string} ns - The namespace for the translations
 * @returns {Promise<Record<string, string>>} Translations object or fallback translations on failure
 */
export async function loadTranslations(_locale: string, _ns: string) {
  let locale = _locale === "zh" ? "zh-CN" : _locale;
  locale = i18n.locales.includes(locale) ? locale : "en";
  const ns = SUPPORTED_NAMESPACES.includes(_ns) ? _ns : "common";
  const cacheKey = `${locale}-${ns}`;

  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  const trans = translations[locale];

  if (trans) {
    translationCache.set(cacheKey, trans);
    return trans;
  }

  // Fallback to English if locale not found
  logger.warn(`Translations not found for locale ${locale}, falling back to English`);
  return translations.en ?? {};
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
