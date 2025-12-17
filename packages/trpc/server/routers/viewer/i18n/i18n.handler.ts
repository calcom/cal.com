import type { I18nInputSchema } from "./i18n.schema";

type I18nOptions = {
  input: I18nInputSchema;
};

export const i18nHandler = async ({ input }: I18nOptions) => {
  const { locale } = input;
  const { serverSideTranslations } = await import("next-i18next/serverSideTranslations");
  const extraLocales = locale !== "en" ? ["en"] : [];
  const i18n = await serverSideTranslations(locale, ["common", "vital"], null, extraLocales);

  return {
    i18n,
    locale,
  };
};

export default i18nHandler;
