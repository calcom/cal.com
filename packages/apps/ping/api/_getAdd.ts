import type { NextApiRequest } from "next";

import checkSession from "@calcom/app-store-core/_utils/auth";
import getInstalledAppPath from "@calcom/app-store-core/_utils/getInstalledAppPath";
import { checkInstalled, createDefaultInstallation } from "@calcom/app-store-core/_utils/installation";
import { defaultResponder } from "@calcom/lib/server";

import appConfig from "../config.json";

export async function getHandler(req: NextApiRequest) {
  const session = checkSession(req);
  const slug = appConfig.slug;
  const appType = appConfig.type;
  const returnTo = req.query?.returnTo;

  await checkInstalled(slug, session.user.id);
  await createDefaultInstallation({
    appType,
    user: session.user,
    slug,
    key: {},
  });

  return { url: returnTo ?? getInstalledAppPath({ variant: appConfig.variant, slug: "ping" }) };
}

export default defaultResponder(getHandler);
