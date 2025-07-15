import { createInstance } from "i18next";

import { CALCOM_VERSION } from "@calcom/lib/constants";

const i18nInstanceCache = new Map<string, any>();

/**
 * Loads English fallback translations for when requested locale translations fail
 * Implements caching to avoid redundant network requests
 * @returns {Promise<Record<string, string>>} English translations object or empty object on failure
 */
async function loadFallbackTranslations(): Promise<Record<string, string>> {
  try {
    const { getBundledTranslations } = await import("./translationBundler");
    const translations = getBundledTranslations("en", "common");
    return translations;
  } catch (error) {
    console.error("Could not load fallback translations:", error);
    return {};
  }
}

/**
 * Loads translations for a specific locale and namespace with optimized caching
 * @param {string} _locale - The locale code (e.g., 'en', 'fr', 'zh')
 * @param {string} ns - The namespace for the translations
 * @returns {Promise<Record<string, string>>} Translations object or fallback translations on failure
 */
export async function loadTranslations(_locale: string, ns: string): Promise<Record<string, string>> {
  const locale = _locale === "zh" ? "zh-CN" : _locale;

  try {
    const { getBundledTranslations } = await import("./translationBundler");
    const translations = getBundledTranslations(locale, ns);
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
  const cacheKey = `${locale}-${ns}-${CALCOM_VERSION}`;
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
