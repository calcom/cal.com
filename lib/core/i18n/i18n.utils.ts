import { IncomingMessage } from "http";
import prisma from "@lib/prisma";
import { i18n } from "../../../next-i18next.config";
import { getSession } from "@lib/auth";
import parser from "accept-language-parser";

export const extractLocaleInfo = async (req: IncomingMessage) => {
  const acceptLanguageHeader = req.headers["accept-language"];
  const session = await getSession({ req: req });

  if (session?.user?.locale) {
    return session.user.locale;
  }

  if (acceptLanguageHeader) {
    const preferredLocale = parser.pick(i18n.locales, acceptLanguageHeader);
    if (preferredLocale) {
      if (session?.user?.locale === null) {
        await prisma.user.update({
          where: {
            id: session.user.id,
          },
          data: {
            locale: preferredLocale,
          },
        });
      }
      return preferredLocale;
    }
  }
  return i18n.defaultLocale;
};

interface localeType {
  [locale: string]: string;
}

export const localeLabels: localeType = {
  en: "English",
  ro: "Romanian",
};

export type OptionType = {
  value: string;
  label: string;
};

export const localeOptions: OptionType[] = i18n.locales.map((locale) => {
  return { value: locale, label: localeLabels[locale] };
});
