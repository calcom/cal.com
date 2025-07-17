import { readFileSync, readdirSync } from "fs";
import { resolve, join } from "path";

import { CALCOM_VERSION } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";

function getLocalesPath() {
  const localesPath = resolve(process.cwd(), "..", "..", "packages/lib/server/locales");
  logger.info(`[translationBundler] getLocalesPath() resolved to: ${localesPath}`);
  return localesPath;
}

interface LocaleCache {
  [cacheKey: string]: Record<string, string>;
}

let localeCache: LocaleCache = {};
let cacheVersion: string | null = null;

function loadTranslationForLocale(locale: string, ns: string): Record<string, string> {
  const cacheKey = `${locale}-${ns}-${CALCOM_VERSION}`;
  logger.debug(
    `[translationBundler] loadTranslationForLocale: locale=${locale}, ns=${ns}, cacheKey=${cacheKey}`
  );

  if (cacheVersion === CALCOM_VERSION && localeCache[cacheKey]) {
    logger.debug(`[translationBundler] Returning cached translations for ${cacheKey}`);
    return localeCache[cacheKey];
  }

  if (cacheVersion !== CALCOM_VERSION) {
    logger.info(`[translationBundler] CALCOM_VERSION changed or cache empty. Resetting cache.`);
    localeCache = {};
    cacheVersion = CALCOM_VERSION;
  }

  const dirToCheck = join(getLocalesPath(), locale);
  try {
    const files = readdirSync(dirToCheck);
    logger.info(`[translationBundler] Files in ${dirToCheck}: ${files.join(", ")}`);
  } catch (err) {
    logger.error(`[translationBundler] Could not list files in ${dirToCheck}:`, err);
  }

  try {
    const translationPath = join(getLocalesPath(), locale, `${ns}.json`);
    logger.info(`[translationBundler] Attempting to load translation file: ${translationPath}`);
    const translations = JSON.parse(
      readFileSync(translationPath, {
        encoding: "utf8",
      })
    );
    localeCache[cacheKey] = translations;
    logger.info(`[translationBundler] Successfully loaded translations for ${locale}/${ns}`);
    return translations;
  } catch (error) {
    logger.error(`[translationBundler] Failed to load translations for ${locale}/${ns}:`, error);
    return {};
  }
}

export function getBundledTranslations(locale: string, ns: string): Record<string, string> {
  const normalizedLocale = locale === "zh" ? "zh-CN" : locale;
  logger.debug(
    `[translationBundler] getBundledTranslations: requested locale=${locale}, normalizedLocale=${normalizedLocale}, ns=${ns}`
  );

  const translations = loadTranslationForLocale(normalizedLocale, ns);
  if (Object.keys(translations).length > 0) {
    logger.info(`[translationBundler] Returning translations for ${normalizedLocale}/${ns}`);
    return translations;
  }

  logger.warn(
    `[translationBundler] No translations found for ${normalizedLocale}/${ns}, falling back to English.`
  );
  const englishTranslations = loadTranslationForLocale("en", ns);
  return englishTranslations;
}
