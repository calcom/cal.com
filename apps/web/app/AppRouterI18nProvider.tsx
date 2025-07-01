"use client";

import { createContext, useMemo } from "react";
import type { ReactNode } from "react";

type AppRouterI18nContextType = {
  translations: Record<string, string>;
  ns: string;
  locale: string;
};

export const AppRouterI18nContext = createContext<AppRouterI18nContextType | null>(null);

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
    [locale, ns]
  );

  return <AppRouterI18nContext.Provider value={value}>{children}</AppRouterI18nContext.Provider>;
}
