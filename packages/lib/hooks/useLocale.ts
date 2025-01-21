import { useTranslation } from "next-i18next";

import { useAtomsContext, useBookerI18n } from "@calcom/atoms/monorepo";

export const useLocale = (namespace: Parameters<typeof useTranslation>[0] = "common") => {
  const context = useAtomsContext();
  const { i18n, t } = useTranslation(namespace);
  const isLocaleReady = Object.keys(i18n).length > 0;

  try {
    const bookerContext = useBookerI18n();
    if (bookerContext.isLocaleReady) {
      return bookerContext;
    }
  } catch {}

  if (context?.clientId) {
    return {
      i18n: context.i18n,
      t: context.t,
      isLocaleReady: true,
    } as unknown as {
      i18n: ReturnType<typeof useTranslation>["i18n"];
      t: ReturnType<typeof useTranslation>["t"];
      isLocaleReady: boolean;
    };
  }
  return {
    i18n,
    t,
    isLocaleReady,
  };
};
