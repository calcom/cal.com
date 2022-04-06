import { useTranslation } from "next-i18next";

export const useLocale = () => {
  const { i18n, t } = useTranslation("common");

  return {
    i18n,
    t,
  };
};
