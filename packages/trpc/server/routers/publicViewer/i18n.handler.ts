import type { NextApiRequest, NextApiResponse } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";

import type { WithLocale } from "../../createContext";

type I18nOptions = {
  ctx: WithLocale & {
    req: NextApiRequest | undefined;
    res: NextApiResponse | undefined;
  };
};

export const i18nHandler = async (locale: string) => {
  const i18n = await serverSideTranslations(locale, ["common", "vital"]);
  return {
    i18n,
    locale,
  };
};

export const localeHandler = async ({ ctx }: I18nOptions) => {
  const { locale } = ctx;

  return { locale };
};
