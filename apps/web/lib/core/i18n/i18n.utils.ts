import parser from "accept-language-parser";
import type { IncomingMessage } from "http";
import type { GetServerSidePropsContext } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import type { Maybe } from "@calcom/trpc/server";

import { i18n } from "../../../next-i18next.config";

export function getLocaleFromHeaders(req: IncomingMessage): string {
  let preferredLocale: string | null | undefined;
  if (req.headers["accept-language"]) {
    preferredLocale = parser.pick(i18n.locales, req.headers["accept-language"]) as Maybe<string>;
  }
  return preferredLocale ?? i18n.defaultLocale;
}

export const getOrSetUserLocaleFromHeaders = async (
  req: GetServerSidePropsContext["req"],
  res: GetServerSidePropsContext["res"]
): Promise<string> => {
  const { default: prisma } = await import("@calcom/prisma");

  const session = await getServerSession({ req, res });
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
