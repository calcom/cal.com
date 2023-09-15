import type { NextApiRequest, NextApiResponse } from "next";

import { defaultResponder } from "@calcom/lib/server";
import { createContext } from "@calcom/trpc/server/createContext";
import { viewerRouter } from "@calcom/trpc/server/routers/viewer/_router";

import checkSession from "../../_utils/auth";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import { checkInstalled, createDefaultInstallation } from "../../_utils/installation";
import appConfig from "../config.json";

export async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const session = checkSession(req);
  const slug = appConfig.slug;
  const appType = appConfig.type;

  const ctx = await createContext({ req, res });
  const caller = viewerRouter.createCaller(ctx);

  const apiKey = await caller.apiKeys.create({
    note: "Cal AI",
    expiresAt: null,
    appId: "cal-ai",
  });

  await checkInstalled(slug, session.user.id);
  await createDefaultInstallation({
    appType,
    userId: session.user.id,
    slug,
    key: {
      apiKey,
    },
  });

  return { url: getInstalledAppPath({ variant: appConfig.variant, slug: "cal-ai" }) };
}

export default defaultResponder(getHandler);
