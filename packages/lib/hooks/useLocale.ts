import { useTranslation } from "next-i18next";

export const useLocale = (namespace: Parameters<typeof useTranslation>[0] = "common") => {
  const { i18n, t } = useTranslation(namespace);
  const isLocaleReady = Object.keys(i18n).length > 0;

  return {
    i18n,
    t,
    isLocaleReady,
  };
};
