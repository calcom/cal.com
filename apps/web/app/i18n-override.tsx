"use client";

import i18next from "i18next";
import type { ReactNode } from "react";
import { useRef } from "react";
import { I18nextProvider, initReactI18next } from "react-i18next";

/**
 * Creates a scoped i18next instance for locale overrides (e.g. booking pages
 * where the event's interfaceLanguage differs from the user's locale).
 *
 * Unlike I18nProvider (which hydrates the global singleton), this component
 * isolates its translations so the rest of the app keeps the user's locale.
 */
export function I18nOverride({
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
  const instanceRef = useRef<ReturnType<typeof i18next.createInstance> | null>(null);
  const prevLocaleRef = useRef<string>("");
  const prevNsRef = useRef<string>("");

  if (!instanceRef.current) {
    const instance = i18next.createInstance();
    instance.use(initReactI18next).init({
      lng: locale,
      resources: { [locale]: { [ns]: translations } },
      defaultNS: ns,
      interpolation: { escapeValue: false },
    });
    instanceRef.current = instance;
    prevLocaleRef.current = locale;
    prevNsRef.current = ns;
  } else if (locale !== prevLocaleRef.current || ns !== prevNsRef.current) {
    // Props changed (e.g. client-side navigation between booking pages with
    // different interfaceLanguage). Update the scoped instance in place.
    instanceRef.current.addResourceBundle(locale, ns, translations, true, true);
    if (instanceRef.current.language !== locale) {
      instanceRef.current.changeLanguage(locale);
    }
    if (instanceRef.current.options.defaultNS !== ns) {
      instanceRef.current.options.defaultNS = ns;
    }
    prevLocaleRef.current = locale;
    prevNsRef.current = ns;
  }

  return <I18nextProvider i18n={instanceRef.current}>{children}</I18nextProvider>;
}
