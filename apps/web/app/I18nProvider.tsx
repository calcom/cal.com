"use client";

import { createContext } from "react";
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
  return (
    <AppRouterI18nContext.Provider value={{ translations, locale, ns }}>
      {children}
    </AppRouterI18nContext.Provider>
  );
}
