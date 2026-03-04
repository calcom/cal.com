import type { NextApiRequest, NextApiResponse } from "next";

import { getLocaleFromRequest } from "@calcom/lib/server/i18n";
import prisma from "@calcom/prisma";
import { defaultResponder } from "@calcom/lib/server";
import { getAppKeys } from "@calcom/app-store/_utils/getAppKeys";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { t } = await getLocaleFromRequest(req);

  if (req.method === "GET") {
    const appKeys = await getAppKeys("proton-calendar", req);
    return {
      icsFeedUrl: appKeys.protonIcsFeedUrl || "",
      hasIcsFeed: !!appKeys.protonIcsFeedUrl,
    };
  }

  throw new Error(t("method_not_allowed"));
}

export default defaultResponder(handler);
