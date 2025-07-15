import { readFileSync } from "fs";
import { join } from "path";
import path from "path";

import { CALCOM_VERSION } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";

function findMonorepoRoot(): string {
  let currentDir = __dirname;
  logger.debug(`[translationBundler] Starting findMonorepoRoot from __dirname: ${__dirname}`);
  while (currentDir !== path.dirname(currentDir)) {
    try {
      const packageJsonPath = path.join(currentDir, "package.json");
      logger.debug(`[translationBundler] Checking for monorepo package.json at: ${packageJsonPath}`);
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
      if (packageJson.workspaces && packageJson.name === "calcom-monorepo") {
        logger.info(`[translationBundler] Found monorepo root at: ${currentDir}`);
        return currentDir;
      }
    } catch (error) {
      logger.debug(`[translationBundler] No package.json at: ${currentDir} (or error reading it)`);
    }
    currentDir = path.dirname(currentDir);
  }

  let fallbackDir = process.cwd();
  logger.debug(`[translationBundler] Fallback: starting from process.cwd(): ${process.cwd()}`);
  while (fallbackDir !== path.dirname(fallbackDir)) {
    try {
      const packageJsonPath = path.join(fallbackDir, "package.json");
      logger.debug(
        `[translationBundler] Fallback: checking for monorepo package.json at: ${packageJsonPath}`
      );
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
      if (packageJson.workspaces && packageJson.name === "calcom-monorepo") {
        logger.info(`[translationBundler] Fallback: found monorepo root at: ${fallbackDir}`);
        return fallbackDir;
      }
    } catch (error) {
      logger.debug(`[translationBundler] Fallback: no package.json at: ${fallbackDir} (or error reading it)`);
    }
    fallbackDir = path.dirname(fallbackDir);
  }

  logger.warn(`[translationBundler] Could not find monorepo root, using process.cwd(): ${process.cwd()}`);
  return process.cwd();
}

const LOCALES_PATH = path.join(findMonorepoRoot(), "packages/lib/server/locales");
logger.info(`[translationBundler] LOCALES_PATH resolved to: ${LOCALES_PATH}`);

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

  try {
    const translationPath = join(LOCALES_PATH, locale, `${ns}.json`);
    logger.info(`[translationBundler] Attempting to load translation file: ${translationPath}`);
    const translations = JSON.parse(readFileSync(translationPath, "utf-8"));
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
