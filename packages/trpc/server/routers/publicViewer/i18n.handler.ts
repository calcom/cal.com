import type { CreateInnerContextOptions } from "../../createContext";
import { getLocale } from "../../trpc";

type I18nOptions = {
  ctx: CreateInnerContextOptions;
};

export const i18nHandler = async ({ ctx }: I18nOptions) => {
  const { locale, i18n } = await getLocale(ctx);

  return {
    i18n,
    locale,
  };
};
