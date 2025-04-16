import { createInstance } from "i18next";

import { WEBAPP_URL } from "@calcom/lib/constants";

const translationCache = new Map<string, Record<string, string>>();
const i18nInstanceCache = new Map<string, any>();

/**
 * Loads English fallback translations for when requested locale translations fail
 * Implements caching to avoid redundant network requests
 * @returns {Promise<Record<string, string>>} English translations object or empty object on failure
 */
async function loadFallbackTranslations() {
  const cacheKey = "en-common";

  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  try {
    const res = await fetch(`${WEBAPP_URL}/static/locales/en/common.json`, {
      cache: process.env.NODE_ENV === "production" ? "force-cache" : "no-store",
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch fallback translations: ${res.status}`);
    }

    const translations = await res.json();
    translationCache.set(cacheKey, translations);
    return translations;
  } catch (error) {
    console.error("Could not fetch fallback translations:", error);
    return {};
  }
}

/**
 * Loads translations for a specific locale and namespace with optimized caching
 * @param {string} _locale - The locale code (e.g., 'en', 'fr', 'zh')
 * @param {string} ns - The namespace for the translations
 * @returns {Promise<Record<string, string>>} Translations object or fallback translations on failure
 */
export async function loadTranslations(_locale: string, ns: string) {
  const locale = _locale === "zh" ? "zh-CN" : _locale;
  const cacheKey = `${locale}-${ns}`;

  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  try {
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
  } catch (error) {
    console.warn(`Failed to load translations for ${locale}/${ns}, falling back to English:`, error);
    const fallbackTranslations = await loadFallbackTranslations();
    return fallbackTranslations;
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
