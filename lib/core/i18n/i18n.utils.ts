import parser from "accept-language-parser";
import { IncomingMessage } from "http";
import i18next from "i18next";
import { i18n as nexti18next } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";

import { getSession } from "@lib/auth";
import prisma from "@lib/prisma";

import { Maybe } from "@trpc/server";

import { i18n } from "../../../next-i18next.config";

export function getLocaleFromHeaders(req: IncomingMessage): string {
  const preferredLocale = parser.pick(
    i18n.locales,
    req.headers["accept-language"] as string
  ) as Maybe<string>;

  return preferredLocale ?? i18n.defaultLocale;
}

export const getOrSetUserLocaleFromHeaders = async (req: IncomingMessage): Promise<string> => {
  const session = await getSession({ req });
  const preferredLocale = getLocaleFromHeaders(req);

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
};

export const getT = async (locale: string, ns: string) => {
  const create = async () => {
    const { _nextI18Next } = await serverSideTranslations(locale, [ns]);
    const _i18n = i18next.createInstance();
    _i18n.init({
      lng: locale,
      resources: _nextI18Next.initialI18nStore,
      fallbackLng: _nextI18Next.userConfig?.i18n.defaultLocale,
    });
    return _i18n;
  };
  const _i18n = nexti18next != null ? nexti18next : await create();
  return _i18n.getFixedT(locale, ns);
};
