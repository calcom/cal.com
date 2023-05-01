import { serverSideTranslations } from "next-i18next/serverSideTranslations";

import { getUserFromSession } from "@calcom/trpc/server/trpc";

import type { CreateInnerContextOptions } from "../../createContext";

export const i18nHandler = async (locale: string) => {
  const i18n = await serverSideTranslations(locale, ["common", "vital"]);
  return {
    i18n,
    locale,
  };
};

export const localeHandler = async (ctx: CreateInnerContextOptions) => {
  const user = await getUserFromSession({ session: ctx.session });

  const locale = user?.locale || ctx.locale;

  return { locale };
};
