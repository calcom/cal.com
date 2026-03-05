"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useMemo } from "react";

type I18nContextType = {
  translations: Record<string, string>;
  ns: string;
  locale: string;
};

export const I18nContext = createContext<I18nContextType | null>(null);

/**
 * Sets a fresh i18n context for the subtree.
 * Used by the root layout (common translations) and booking pages (locale override).
 */
export function I18nProvider({
  children,
  translations,
  locale,
  ns,
}: I18nContextType & {
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({
      translations,
      locale,
      ns,
    }),
    [locale, ns, translations]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * Merges additional translations into the nearest parent I18nContext.
 * Inherits locale from the parent -- cannot override it.
 * Used by feature layouts (e.g. PBAC) that load a separate namespace.
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
  const parent = useContext(I18nContext);
  if (!parent) {
    throw new Error("I18nExtend must be used inside an I18nProvider");
  }

  const value = useMemo(
    () => ({
      locale: parent.locale,
      translations: { ...parent.translations, ...translations },
      ns: `${parent.ns}+${ns}`,
    }),
    [parent.locale, parent.translations, parent.ns, translations, ns]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
