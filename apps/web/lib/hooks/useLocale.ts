import { useTranslation } from "next-i18next";

export const useLocale = () => {
  const t = (a) => {
    return a;
  };
  return {
    t,
  };
};
