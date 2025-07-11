import { readFileSync, readdirSync } from "fs";
import { join } from "path";

import { CALCOM_VERSION } from "@calcom/lib/constants";

const LOCALES_PATH = join(__dirname, "../../../apps/web/public/static/locales");

interface TranslationBundle {
  [locale: string]: {
    [namespace: string]: Record<string, string>;
  };
}

let translationBundle: TranslationBundle | null = null;
let bundleVersion: string | null = null;

function loadTranslationBundle(): TranslationBundle {
  if (translationBundle && bundleVersion === CALCOM_VERSION) {
    return translationBundle;
  }

  const bundle: TranslationBundle = {};
  const locales = readdirSync(LOCALES_PATH);

  for (const locale of locales) {
    const localePath = join(LOCALES_PATH, locale);
    try {
      const commonJsonPath = join(localePath, "common.json");
      const translations = JSON.parse(readFileSync(commonJsonPath, "utf-8"));

      if (!bundle[locale]) {
        bundle[locale] = {};
      }
      bundle[locale]["common"] = translations;
    } catch (error) {
      console.warn(`Failed to load translations for locale ${locale}:`, error);
    }
  }

  translationBundle = bundle;
  bundleVersion = CALCOM_VERSION;
  return bundle;
}

export function getBundledTranslations(locale: string, ns: string): Record<string, string> {
  const bundle = loadTranslationBundle();
  const normalizedLocale = locale === "zh" ? "zh-CN" : locale;

  const localeTranslations = bundle[normalizedLocale];
  if (localeTranslations && localeTranslations[ns]) {
    return localeTranslations[ns];
  }

  const englishTranslations = bundle["en"];
  if (englishTranslations && englishTranslations[ns]) {
    return englishTranslations[ns];
  }

  return {};
}
