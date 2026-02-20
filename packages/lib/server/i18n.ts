import fs from "fs";
import { createInstance } from "i18next";
import path from "path";

const translationCache = new Map<string, Record<string, string>>();
const i18nInstanceCache = new Map<string, any>();

/**Helper fn to load the start of target dir */
function findRepoRoot(startDir: string, rootFolderName: string) {
  let currentDir = startDir;

  while (true) {
    const baseName = path.basename(currentDir);

    if (baseName === rootFolderName) {
      return currentDir;
    }

    const parentDir = path.dirname(currentDir);

    if (parentDir === currentDir) {
      throw new Error(`Could not find repo root "${rootFolderName}"`);
    }

    currentDir = parentDir;
  }
}

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
    const repoRoot = findRepoRoot(__dirname, "apps");

    const filePath = path.join(repoRoot, "web", "public", "static", "locales", "en", "common.json");

    const file = await fs.promises.readFile(filePath, "utf-8");
    const translations = JSON.parse(file);

    translationCache.set(cacheKey, translations);
    return translations;
  } catch (error) {
    console.error("Could not load fallback translations from filesystem:", error);
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
    const repoRoot = findRepoRoot(__dirname, "apps");

    const filePath = path.join(repoRoot, "web", "public", "static", "locales", locale, `${ns}.json`);

    const file = await fs.promises.readFile(filePath, "utf-8");
    const translations = JSON.parse(file);

    translationCache.set(cacheKey, translations);
    return translations;
  } catch (error) {
    console.warn(`Failed to load translations for ${locale}/${ns}, falling back to English:`, error);

    return loadFallbackTranslations();
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
