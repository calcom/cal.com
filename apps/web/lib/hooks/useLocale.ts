import { useTranslation } from "next-i18next";

/** @deprecated use the one from `@calcom/lib/hooks/useLocale` */
export const useLocale = () => {
  const { i18n, t } = useTranslation("common");

  return {
    i18n,
    t,
  };
};
