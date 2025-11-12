import { createContext } from "react";

export type AppRouterI18nContextType = {
  translations: Record<string, string>;
  ns: string;
  locale: string;
};

export const AppRouterI18nContext = createContext<AppRouterI18nContextType | null>(null);
