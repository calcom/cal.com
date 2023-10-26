import { i18n as nexti18next } from "next-i18next";

import { create } from "./getFixedT";

export const getTranslation = async (locale: string, ns: string) => {
  const _i18n = nexti18next != null ? nexti18next : await create(locale, ns);
  return _i18n.getFixedT(locale, ns);
};
