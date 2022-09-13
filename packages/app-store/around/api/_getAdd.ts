import type { NextApiRequest, NextApiResponse } from "next";

import getInstalledAppPath from "@calcom/app-store/_utils/getInstalledAppPath";
import { defaultResponder } from "@calcom/lib/server";

import checkSession from "../../_utils/auth";
import { checkInstalled, createDefaultInstallation } from "../../_utils/installation";
import appConfig from "../config.json";

export async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const session = checkSession(req);
  const slug = appConfig.slug;
  const variant = appConfig.variant;
  const appType = appConfig.type;

  await checkInstalled(slug, session.user.id);
  await createDefaultInstallation({
    appType,
    userId: session.user.id,
    slug,
    key: {},
  });

  return { url: getInstalledAppPath({ variant, slug }) };
}

export default defaultResponder(getHandler);
