import i18next from "i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";

//@ts-expect-error no type definitions
import config from "@calcom/web/next-i18next.config";

export const create = async (locale: string, ns: string) => {
  const { _nextI18Next } = await serverSideTranslations(locale, [ns], config);

  const _i18n = i18next.createInstance();
  _i18n.init({
    lng: locale,
    resources: _nextI18Next?.initialI18nStore,
    fallbackLng: _nextI18Next?.userConfig?.i18n.defaultLocale,
  });
  return _i18n;
};

export const getFixedT = async (locale: string, ns: string) => {
  const i18n = await create(locale, ns);

  return i18n.getFixedT(locale, ns);
};
