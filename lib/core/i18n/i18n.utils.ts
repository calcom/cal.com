import parser from "accept-language-parser";
import { IncomingMessage } from "http";

import { getSession } from "@lib/auth";
import prisma from "@lib/prisma";

import { i18n } from "../../../next-i18next.config";

export const getOrSetUserLocaleFromHeaders = async (req: IncomingMessage) => {
  const session = await getSession({ req });
  const preferredLocale = parser.pick(i18n.locales, req.headers["accept-language"]);

  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        locale: true,
      },
    });

    if (user?.locale) {
      return user.locale;
    }

    if (preferredLocale) {
      await prisma.user.update({
        where: {
          id: session.user.id,
        },
        data: {
          locale: preferredLocale,
        },
      });
    } else {
      await prisma.user.update({
        where: {
          id: session.user.id,
        },
        data: {
          locale: i18n.defaultLocale,
        },
      });
    }
  }

  if (preferredLocale) {
    return preferredLocale;
  }

  return i18n.defaultLocale;
};

interface localeType {
  [locale: string]: string;
}

export const localeLabels: localeType = {
  en: "English",
  fr: "French",
  it: "Italian",
  ru: "Russian",
  es: "Spanish",
  de: "German",
  pt: "Portuguese",
  ro: "Romanian",
  nl: "Dutch",
};

export type OptionType = {
  value: string;
  label: string;
};

export const localeOptions: OptionType[] = i18n.locales.map((locale) => {
  return { value: locale, label: localeLabels[locale] };
});
