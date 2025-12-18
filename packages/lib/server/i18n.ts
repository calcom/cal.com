import { createInstance } from "i18next";

import { WEBAPP_URL } from "@calcom/lib/constants";

import { fetchWithTimeout } from "../fetchWithTimeout";
import logger from "../logger";

const { i18n } = require("@calcom/config/next-i18next.config");
const log = logger.getSubLogger({ prefix: ["[i18n]"] });

// Import only English translations directly to avoid HTTP requests
// Other languages will be loaded dynamically to minimize bundle size
const englishTranslations: Record<
  string,
  string
> = require("../../../apps/web/public/static/locales/en/common.json");

const translationCache = new Map<string, Record<string, string>>();
const i18nInstanceCache = new Map<string, any>();
const SUPPORTED_NAMESPACES = ["common"];

export function mergeWithEnglishFallback(localeTranslations: Record<string, string>): Record<string, string> {
  return {
    // IMPORTANT: Spread English translations first to provide fallback for missing keys
    ...englishTranslations,
    // Then spread locale translations to override English when keys exist in both
    ...localeTranslations,
  };
}

/**
 * Loads translations for a specific locale and namespace with optimized caching
 * English translations are bundled as englishTranslations for reliability,
 * other languages use dynamic imports with HTTP fallback to minimize bundle size
 * @param {string} _locale - The locale code (e.g., 'en', 'fr', 'zh')
 * @param {string} ns - The namespace for the translations
 * @returns {Promise<Record<string, string>>} Translations object or fallback translations on failure
 */
export async function loadTranslations(_locale: string, _ns: string) {
  let locale = _locale === "zh" ? "zh-CN" : _locale;
  locale = i18n.locales.includes(locale) ? locale : "en";
  const ns = SUPPORTED_NAMESPACES.includes(_ns) ? _ns : "common";
  const cacheKey = `${locale}-${ns}`;

  const cached = translationCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  if (locale === "en") {
    translationCache.set(cacheKey, englishTranslations);
    return englishTranslations;
  }

  try {
    const { default: localeTranslations } = await import(
      `../../../apps/web/public/static/locales/${locale}/${ns}.json`
    );

    const mergedTranslations = mergeWithEnglishFallback(localeTranslations);
    translationCache.set(cacheKey, mergedTranslations);
    return mergedTranslations;
  } catch (dynamicImportErr) {
    log.warn(`Dynamic import failed for locale ${locale}:`, dynamicImportErr);

    // Try HTTP fallback as second option
    try {
      const response = await fetchWithTimeout(
        `${WEBAPP_URL}/static/locales/${locale}/${ns}.json`,
        {
          cache: "no-store",
        },
        3000
      );
      if (response.ok) {
        const httpTranslations = await response.json();
        const mergedTranslations = mergeWithEnglishFallback(httpTranslations);
        translationCache.set(cacheKey, mergedTranslations);
        return mergedTranslations;
      }
    } catch (httpErr) {
      log.error(`HTTP fallback also failed for locale ${locale}:`, httpErr);
    }

    log.info(`Falling back to English for locale: ${locale}`);
    return englishTranslations;
  }
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
