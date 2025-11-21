"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";

import { CustomI18nContext } from "@calcom/lib/i18n/CustomI18nContext";
import type { CustomI18nContextType } from "@calcom/lib/i18n/CustomI18nContext";

export function CustomI18nProvider({
  children,
  translations,
  locale,
  ns,
}: CustomI18nContextType & {
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

  return <CustomI18nContext.Provider value={value}>{children}</CustomI18nContext.Provider>;
}
