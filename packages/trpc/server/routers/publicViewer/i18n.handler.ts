import type { NextApiRequest, NextApiResponse } from "next";

import type { WithLocale } from "../../createContext";

type I18nOptions = {
  ctx: WithLocale & {
    req: NextApiRequest | undefined;
    res: NextApiResponse | undefined;
  };
};

export const i18nHandler = async ({ ctx }: I18nOptions) => {
  const { locale, i18n } = ctx;

  return {
    i18n,
    locale,
  };
};
