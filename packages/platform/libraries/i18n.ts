import { createInstance } from "i18next";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { fetchWithTimeout } from "@calcom/lib/fetchWithTimeout";
import logger from "@calcom/lib/logger";

/* eslint-disable @typescript-eslint/no-var-requires */
const { i18n } = require("@calcom/config/next-i18next.config");
const log = logger.getSubLogger({ prefix: ["[i18n]"] });

const translationCache = new Map<string, Record<string, string>>();
const i18nInstanceCache = new Map<string, any>();
const SUPPORTED_NAMESPACES = ["common"];

/**
 * Fetches translations for a specific locale and namespace via HTTP with caching.
 * All languages, including English, are fetched remotely.
 * @param {string} _locale - The locale code (e.g., 'en', 'fr', 'zh')
 * @param {string} ns - The namespace for the translations
 * @returns {Promise<Record<string, string>>} Translations object or fallback translations on failure
 */
export async function loadTranslations(_locale: string, _ns: string): Promise<Record<string, string>> {
  let locale = _locale === "zh" ? "zh-CN" : _locale;
  locale = i18n.locales.includes(locale) ? locale : "en";
  const ns = SUPPORTED_NAMESPACES.includes(_ns) ? _ns : "common";
  const cacheKey = `${locale}-${ns}`;

  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey) as Record<string, string>;
  }

  // Primary fetch attempt for the requested locale
  try {
    const url = `${WEBAPP_URL}/static/locales/${locale}/${ns}.json`;
    const response = await fetchWithTimeout(url, { cache: "no-store" }, 3000);

    if (response.ok) {
      const translations = await response.json();
      translationCache.set(cacheKey, translations);
      return translations;
    }
    // If response is not OK (e.g., 404), throw to trigger the catch block for fallback logic.
    throw new Error(`Request failed with status ${response.status}`);
  } catch (error) {
    log.warn(`Failed to fetch locale '${locale}'. Attempting fallback to English.`, error);

    // If the failed locale was not English, try fetching English as a fallback.
    if (locale !== "en") {
      const fallbackCacheKey = `en-${ns}`;
      if (translationCache.has(fallbackCacheKey)) {
        return translationCache.get(fallbackCacheKey) as Record<string, string>;
      }

      try {
        const fallbackUrl = `${WEBAPP_URL}/static/locales/en/${ns}.json`;
        const fallbackResponse = await fetchWithTimeout(fallbackUrl, { cache: "no-store" }, 3000);
        if (fallbackResponse.ok) {
          const englishTranslations = await fallbackResponse.json();
          translationCache.set(fallbackCacheKey, englishTranslations);
          return englishTranslations;
        }
      } catch (fallbackError) {
        log.error("Critical: Fallback fetch for English translations also failed.", fallbackError);
      }
    }

    // If all attempts fail, return an empty object to prevent a crash.
    log.error(`All fetch attempts failed for locale '${locale}'. Returning empty object.`);
    return {};
  }
}

/**
 * Creates or retrieves a cached i18next translation function for the specified locale and namespace.
 * (This function does not need to be changed)
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
