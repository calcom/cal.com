import type { i18n, TFunction } from "i18next";
import { useTranslation } from "react-i18next";

export type useLocaleReturnType = {
  i18n: i18n;
  t: TFunction;
  isLocaleReady: boolean;
};

export const useLocale = (
  namespace: Parameters<typeof useTranslation>[0] = "common"
): useLocaleReturnType => {
  const { i18n, t } = useTranslation(namespace);
  const isLocaleReady = Object.keys(i18n).length > 0;
  return {
    i18n,
    t,
    isLocaleReady,
  };
};
