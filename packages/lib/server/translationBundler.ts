import { readFileSync } from "fs";
import { join } from "path";
import path from "path";

import { CALCOM_VERSION } from "@calcom/lib/constants";

function findMonorepoRoot(): string {
  let currentDir = process.cwd();
  while (currentDir !== path.dirname(currentDir)) {
    try {
      const packageJsonPath = path.join(currentDir, "package.json");
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
      if (packageJson.workspaces && packageJson.name === "calcom-monorepo") {
        return currentDir;
      }
    } catch (error) {
      // package.json doesn't exist in this directory
      // Just continue to the next directory
    }
    currentDir = path.dirname(currentDir);
  }

  return process.cwd();
}

const LOCALES_PATH = path.join(findMonorepoRoot(), "packages/lib/server/locales");

interface LocaleCache {
  [cacheKey: string]: Record<string, string>;
}

let localeCache: LocaleCache = {};
let cacheVersion: string | null = null;

function loadTranslationForLocale(locale: string, ns: string): Record<string, string> {
  const cacheKey = `${locale}-${ns}-${CALCOM_VERSION}`;

  if (cacheVersion === CALCOM_VERSION && localeCache[cacheKey]) {
    return localeCache[cacheKey];
  }

  if (cacheVersion !== CALCOM_VERSION) {
    localeCache = {};
    cacheVersion = CALCOM_VERSION;
  }

  try {
    const translationPath = join(LOCALES_PATH, locale, `${ns}.json`);
    const translations = JSON.parse(readFileSync(translationPath, "utf-8"));
    localeCache[cacheKey] = translations;
    return translations;
  } catch (error) {
    console.warn(`Failed to load translations for ${locale}/${ns}:`, error);
    return {};
  }
}

export function getBundledTranslations(locale: string, ns: string): Record<string, string> {
  const normalizedLocale = locale === "zh" ? "zh-CN" : locale;

  const translations = loadTranslationForLocale(normalizedLocale, ns);
  if (Object.keys(translations).length > 0) {
    return translations;
  }

  const englishTranslations = loadTranslationForLocale("en", ns);
  return englishTranslations;
}
