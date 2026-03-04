import type { NextApiRequest, NextApiResponse } from "next";

import { getLocaleFromRequest } from "@calcom/lib/server/i18n";
import prisma from "@calcom/prisma";
import { defaultResponder } from "@calcom/lib/server";
import { getAppKeys } from "@calcom/app-store/_utils/getAppKeys";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { t } = await getLocaleFromRequest(req);

  if (req.method === "GET") {
    const appKeys = await getAppKeys("bigbluebutton", req);
    return {
      serverUrl: appKeys.bigBlueButtonServerUrl || "",
      hasSecret: !!appKeys.bigBlueButtonSecret,
    };
  }

  throw new Error(t("method_not_allowed"));
}

export default defaultResponder(handler);
