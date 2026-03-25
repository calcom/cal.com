import fs from "fs";
import { createInstance } from "i18next";
import path from "path";

import { WEBAPP_URL } from "../constants";

const translationCache = new Map<string, Record<string, string>>();
const i18nInstanceCache = new Map<string, any>();

const LOCALES_ENV_OVERRIDES = ["I18N_LOCALES_ROOT", "LOCALES_ROOT"] as const;

function walkUpDirectories(startDir: string): string[] {
  const dirs: string[] = [];
  let currentDir = path.resolve(startDir);

  while (true) {
    dirs.push(currentDir);
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
  }

  return dirs;
}

function buildLocaleFileCandidates(baseDir: string, locale: string, ns: string): string[] {
  const fileName = `${ns}.json`;
  return [
    path.join(baseDir, locale, fileName),
    path.join(baseDir, "locales", locale, fileName),
    path.join(baseDir, "static", "locales", locale, fileName),
    path.join(baseDir, "public", "static", "locales", locale, fileName),
    path.join(baseDir, "apps", "web", "public", "static", "locales", locale, fileName),
  ];
}

function getLocaleFilePaths(locale: string, ns: string): string[] {
  const paths = new Set<string>();

  for (const envName of LOCALES_ENV_OVERRIDES) {
    const overridePath = process.env[envName];
    if (!overridePath) continue;
    const resolvedOverride = path.isAbsolute(overridePath)
      ? overridePath
      : path.resolve(process.cwd(), overridePath);
    for (const filePath of buildLocaleFileCandidates(resolvedOverride, locale, ns)) {
      paths.add(filePath);
    }
  }

  const startDirs = [
    process.cwd(),
    __dirname,
    process.argv[1] ? path.dirname(process.argv[1]) : undefined,
  ].filter((dir): dir is string => Boolean(dir));

  for (const startDir of startDirs) {
    for (const dir of walkUpDirectories(startDir)) {
      for (const filePath of buildLocaleFileCandidates(dir, locale, ns)) {
        paths.add(filePath);
      }
    }
  }

  return Array.from(paths);
}

/**
 * Load translations from filesystem (primary strategy)
 */
async function loadFromFile(locale: string, ns: string) {
  const attemptedPaths: string[] = [];

  for (const filePath of getLocaleFilePaths(locale, ns)) {
    attemptedPaths.push(filePath);
    try {
      const file = await fs.promises.readFile(filePath, "utf-8");
      return JSON.parse(file);
    } catch (error: any) {
      if (error?.code === "ENOENT") {
        continue;
      }

      if (error instanceof SyntaxError) {
        throw new Error(`Translation JSON parse failed at ${filePath}: ${error.message}`);
      }

      throw new Error(`Translation file read failed at ${filePath}: ${error?.message ?? String(error)}`);
    }
  }

  throw new Error(
    `Translation file not found for ${locale}/${ns}. Attempted ${
      attemptedPaths.length
    } path(s):\n${attemptedPaths.map((p) => `- ${p}`).join("\n")}`
  );
}

/**
 * Load translations from network (fallback strategy)
 */
async function loadFromNetwork(locale: string, ns: string) {
  if (!WEBAPP_URL) {
    throw new Error("WEBAPP_URL not defined for network fallback");
  }

  const res = await fetch(`${WEBAPP_URL}/static/locales/${locale}/${ns}.json`, {
    cache: process.env.NODE_ENV === "production" ? "force-cache" : "no-store",
  });

  if (!res.ok) {
    throw new Error(`Network fallback failed: ${res.status}`);
  }

  return res.json();
}

/**
 * English fallback loader (filesystem first, network as last resort)
 */
async function loadFallbackTranslations() {
  const cacheKey = "en-common";

  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  try {
    const translations = await loadFromFile("en", "common");
    translationCache.set(cacheKey, translations);
    return translations;
  } catch (fileError) {
    console.warn("English fallback file load failed:", fileError);

    try {
      const translations = await loadFromNetwork("en", "common");
      translationCache.set(cacheKey, translations);
      return translations;
    } catch (networkError) {
      console.error("English fallback network load failed:", networkError);
      return {};
    }
  }
}

/**
 * Loads translations for a specific locale + namespace
 * Strategy:
 * 1️⃣ Try filesystem
 * 2️⃣ Fallback to network
 * 3️⃣ Fallback to English common
 */
export async function loadTranslations(_locale: string, ns: string): Promise<Record<string, string>> {
  const locale = _locale === "zh" ? "zh-CN" : _locale;
  const cacheKey = `${locale}-${ns}`;

  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  try {
    // Primary: filesystem
    const translations = await loadFromFile(locale, ns);
    translationCache.set(cacheKey, translations);
    return translations;
  } catch (fileError) {
    console.warn(`File-based load failed for ${locale}/${ns}:`, fileError);

    try {
      // Secondary: network
      const translations = await loadFromNetwork(locale, ns);
      translationCache.set(cacheKey, translations);
      return translations;
    } catch (networkError) {
      console.error(`Network load failed for ${locale}/${ns}:`, networkError);

      // Final fallback
      return loadFallbackTranslations();
    }
  }
}

/**
 * Creates or retrieves cached i18next instance
 */
export const getTranslation = async (locale: string, ns: string) => {
  const cacheKey = `${locale}-${ns}`;

  if (i18nInstanceCache.has(cacheKey)) {
    return i18nInstanceCache.get(cacheKey).getFixedT(locale, ns);
  }

  const resources = await loadTranslations(locale, ns);

  const i18n = createInstance();

  await i18n.init({
    lng: locale,
    fallbackLng: "en",
    resources: {
      [locale]: {
        [ns]: resources,
      },
    },
  });

  i18nInstanceCache.set(cacheKey, i18n);

  return i18n.getFixedT(locale, ns);
};
