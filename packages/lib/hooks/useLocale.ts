import { useTranslation } from "next-i18next";

export const useLocale = (namespace: Parameters<typeof useTranslation>[0] = "common") => {
  const { i18n, t } = useTranslation(namespace);

  return {
    i18n,
    t,
  };
};
