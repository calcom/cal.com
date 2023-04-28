import type { NextApiRequest, NextApiResponse } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { cacheHeader } from "pretty-cache-header";
import { z } from "zod";

import { defaultHandler } from "@calcom/lib/server";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { i18n } = require("@calcom/config/next-i18next.config");

const schema = z.string().default(i18n.defaultLocale as string);

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const locale = schema.parse(req.query?.lang);

  const i18n = await serverSideTranslations(locale, ["common", "vital"]);

  res.setHeader("Cache-Control", cacheHeader({ public: true, maxAge: "1d", staleWhileRevalidate: "1d" }));
  return res.status(200).json({ i18n, locale });
}

export default defaultHandler({
  GET: Promise.resolve({ default: handler }),
});
