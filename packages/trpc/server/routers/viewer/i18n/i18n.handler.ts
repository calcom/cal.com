import i18nConfig from "@calcom/i18n/next-i18next.config";
import type { I18nInputSchema } from "./i18n.schema";

type I18nOptions = {
  input: I18nInputSchema;
};

export const i18nHandler = async ({ input }: I18nOptions) => {
  const { locale } = input;
  const { serverSideTranslations } = await import("next-i18next/serverSideTranslations");
  const i18n = await serverSideTranslations(locale, ["common", "vital"], i18nConfig);

  return {
    i18n,
    locale,
  };
};

export default i18nHandler;
