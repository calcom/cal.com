import { useTranslation } from "next-i18next";

import { useAtomsContext } from "@calcom/atoms/monorepo";
import en_json from "@calcom/web/public/static/locales/en/common.json";
import pt_br_json from "@calcom/web/public/static/locales/pt-BR/common.json";

export const useLocale = (namespace: Parameters<typeof useTranslation>[0] = "common") => {
  const context = useAtomsContext();
  const { i18n, t } = useTranslation(namespace);
  const isLocaleReady = Object.keys(i18n).length > 0;

  if (context?.clientId) {
    return { i18n: context.i18n, t: context.t, isLocaleReady: true } as unknown as {
      i18n: ReturnType<typeof useTranslation>["i18n"];
      t: ReturnType<typeof useTranslation>["t"];
      isLocaleReady: boolean;
    };
  }
  return {
    i18n: { ...i18n, language: "pt-BR" },
    t: (key: string) => pt_br_json[key] || en_json[key],
    isLocaleReady,
  };
};
