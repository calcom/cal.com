 
import parser from "accept-language-parser";
import type { GetServerSidePropsContext, NextApiRequest } from "next";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

type Maybe<T> = T | null | undefined;

const { i18n } = require("@calcom/config/next-i18next.config");

export async function getLocaleFromRequest(
  req: NextApiRequest | GetServerSidePropsContext["req"]
): Promise<string> {
  const session = await getServerSession({ req });
  if (session?.user?.locale) return session.user.locale;
  let preferredLocale: string | null | undefined;
  if (req.headers["accept-language"]) {
    preferredLocale = parser.pick(i18n.locales, req.headers["accept-language"], {
      loose: true,
    }) as Maybe<string>;
  }
  return preferredLocale ?? i18n.defaultLocale;
}
