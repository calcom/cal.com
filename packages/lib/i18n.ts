/* eslint-disable @typescript-eslint/no-var-requires */
import parser from "accept-language-parser";
import { IncomingMessage } from "http";

import prisma from "@calcom/prisma";
import { Maybe } from "@calcom/trpc/server";

import { getSession } from "./auth";

const { i18n } = require("@calcom/config/next-i18next.config");

export function getLocaleFromHeaders(req: IncomingMessage): string {
  let preferredLocale: string | null | undefined;
  if (req.headers["accept-language"]) {
    preferredLocale = parser.pick(i18n.locales, req.headers["accept-language"]) as Maybe<string>;
  }
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
