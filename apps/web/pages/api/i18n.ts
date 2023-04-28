import type { NextApiRequest, NextApiResponse } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { cacheHeader } from "pretty-cache-header";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { getLocaleFromHeaders } from "@calcom/lib/i18n";
import { defaultHandler } from "@calcom/lib/server";
import { getUserFromSession } from "@calcom/trpc/server/trpc";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession({ req, res });

  const user = await getUserFromSession({ session });

  const reqLocale = getLocaleFromHeaders(req);

  const locale = user?.locale && user?.locale !== reqLocale ? user.locale : reqLocale;

  const i18n = await serverSideTranslations(locale, ["common", "vital"]);

  res.setHeader("Cache-Control", cacheHeader({ public: true, maxAge: "1d", staleWhileRevalidate: "1d" }));
  return res.status(200).json({ i18n, locale });
}

export default defaultHandler({
  GET: Promise.resolve({ default: handler }),
});
