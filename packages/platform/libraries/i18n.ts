import { createInstance } from "i18next";
import type { i18n as I18nInstance } from "i18next";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { fetchWithTimeout } from "@calcom/lib/fetchWithTimeout";
import logger from "@calcom/lib/logger";

/* eslint-disable @typescript-eslint/no-require-imports */
const { i18n } = require("@calcom/config/next-i18next.config");
const path = require("path");
const translationsPath = path.resolve(__dirname, "../../../../apps/web/public/static/locales/en/common.json");
const englishTranslations: Record<string, string> = require(translationsPath);
/* eslint-enable @typescript-eslint/no-require-imports */

const translationCache = new Map<string, Record<string, string>>([["en-common", englishTranslations]]);
const i18nInstanceCache = new Map<string, I18nInstance>();
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

  const url = `${WEBAPP_URL}/static/locales/${locale}/${ns}.json`;
  try {
    const response = await fetchWithTimeout(
      url,
      {
        cache: "no-store",
      },
      process.env.NODE_ENV === "development" ? 30000 : 3000
    );

    if (!response.ok) {
      logger.warn(`Failed to fetch translations for ${locale}: ${response.status}, falling back to English`);
      return englishTranslations;
    }

    const translations = await response.json();
    translationCache.set(cacheKey, translations);
    return translations;
  } catch (err) {
    logger.warn(`Failed to load translations for ${locale}, falling back to English:`, err);
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
  const cachedInstance = i18nInstanceCache.get(cacheKey);
  if (cachedInstance) {
    return cachedInstance.getFixedT(locale, ns);
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
