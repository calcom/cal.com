"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";

import { AppRouterI18nContext } from "@calcom/lib/i18n/AppRouterI18nContext";
import type { AppRouterI18nContextType } from "@calcom/lib/i18n/AppRouterI18nContext";

export function AppRouterI18nProvider({
  children,
  translations,
  locale,
  ns,
}: AppRouterI18nContextType & {
  children: ReactNode;
}) {
  // Memoize the value to prevent re-renders unless the data changes
  const value = useMemo(
    () => ({
      translations,
      locale,
      ns,
    }),
    [translations, locale, ns]
  );

  return <AppRouterI18nContext.Provider value={value}>{children}</AppRouterI18nContext.Provider>;
}
