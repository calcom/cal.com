"use client";

import i18next from "i18next";
import type { ReactNode } from "react";
import { I18nextProvider, initReactI18next } from "react-i18next";

let globalI18nInitialized = false;

function ensureI18nInitialized(locale: string, ns: string, translations: Record<string, string>) {
  if (!globalI18nInitialized) {
    i18next.use(initReactI18next).init({
      lng: locale,
      resources: { [locale]: { [ns]: translations } },
      defaultNS: ns,
      interpolation: { escapeValue: false },
    });
    globalI18nInitialized = true;
    return;
  }
  // Update existing instance with new/changed translations (deep-merge)
  i18next.addResourceBundle(locale, ns, translations, true, true);
  if (i18next.language !== locale) {
    i18next.changeLanguage(locale);
  }
}

/**
 * Hydrates react-i18next globally with server-loaded translations.
 * Used by the root layout (common translations) and booking pages (locale override).
 */
export function I18nProvider({
  children,
  translations,
  locale,
  ns,
}: {
  children: ReactNode;
  translations: Record<string, string>;
  locale: string;
  ns: string;
}) {
  // Always sync the global instance's language with our locale prop.
  // This handles the case where a nested provider (e.g. booking page) changed
  // the global language and the user navigated back.
  ensureI18nInitialized(locale, ns, translations);

  return <I18nextProvider i18n={i18next}>{children}</I18nextProvider>;
}

/**
 * Backward-compatible shim: merges additional translations into the "common"
 * namespace so that existing useLocale() callers (which default to "common")
 * can resolve the keys without needing an explicit namespace argument.
 *
 * PR 2 migrates consuming components to useLocale(["settings_organizations_roles", "common"]),
 * at which point this merges into the proper namespace instead.
 */
export function I18nExtend({
  children,
  translations,
  ns,
}: {
  children: ReactNode;
  translations: Record<string, string>;
  ns: string;
}) {
  const locale = i18next.language ?? "en";

  // Register under both the dedicated namespace AND common so that:
  // 1. Components already updated to useLocale([ns, "common"]) find keys in the proper ns
  // 2. Components still using bare useLocale() find keys via the common namespace merge
  i18next.addResourceBundle(locale, ns, translations, true, true);
  i18next.addResourceBundle(locale, "common", translations, true, true);

  return <>{children}</>;
}
