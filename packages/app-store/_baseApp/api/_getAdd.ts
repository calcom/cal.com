import type { NextApiRequest, NextApiResponse } from "next";

import { defaultResponder } from "@calcom/lib/server";

import checkSession from "../../_utils/auth";
import { checkInstalled, createDefaultInstallation } from "../../_utils/installation";
import appConfig from "../config.json";

export async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const session = checkSession(req);
  const slug = appConfig.slug;
  const appType = appConfig.type;

  await checkInstalled(slug, session.user.id);
  await createDefaultInstallation({
    appType,
    userId: session.user.id,
    slug,
    key: {},
  });

  return { url: "/apps/installed" };
}

export default defaultResponder(getHandler);
