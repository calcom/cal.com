import { createContext } from "react";

export type CustomI18nContextType = {
  translations: Record<string, string>;
  ns: string;
  locale: string;
};

export const CustomI18nContext = createContext<CustomI18nContextType | null>(null);
