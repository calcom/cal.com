import type { NextApiRequest, NextApiResponse } from "next";

import type { WithLocale } from "../../createContext";
import type { I18nInputSchema } from "./i18n.schema";

type I18nOptions = {
  ctx: WithLocale & {
    req: NextApiRequest | undefined;
    res: NextApiResponse | undefined;
  };
  input: I18nInputSchema;
};

export const i18nHandler = async ({ input }: I18nOptions) => {
  const { locale } = input;
  const { serverSideTranslations } = await import("next-i18next/serverSideTranslations");
  const i18n = await serverSideTranslations(locale, ["common", "vital"]);

  return {
    i18n,
    locale,
  };
};

export default i18nHandler;
