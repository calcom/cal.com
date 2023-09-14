import i18next from "i18next";
import { i18n as nexti18next } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";

export const getTranslation = async (locale: string, ns: string) => {
  const create = async () => {
    const { _nextI18Next } = await serverSideTranslations(locale, [ns]);
    const _i18n = i18next.createInstance();
    _i18n.init({
      lng: locale,
      resources: _nextI18Next?.initialI18nStore,
      fallbackLng: _nextI18Next?.userConfig?.i18n.defaultLocale,
    });
    return _i18n;
  };
  const _i18n = nexti18next != null ? nexti18next : await create();
  return _i18n.getFixedT(locale, ns);
};
