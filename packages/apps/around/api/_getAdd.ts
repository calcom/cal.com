import type { NextApiRequest } from "next";

import checkSession from "@calcom/app-store-core/_utils/auth";
import getInstalledAppPath from "@calcom/app-store-core/_utils/getInstalledAppPath";
import { checkInstalled, createDefaultInstallation } from "@calcom/app-store-core/_utils/installation";
import { defaultResponder } from "@calcom/lib/server";

import appConfig from "../config.json";

export async function getHandler(req: NextApiRequest) {
  const session = checkSession(req);
  const slug = appConfig.slug;
  const variant = appConfig.variant;
  const appType = appConfig.type;
  const teamId = req.query.teamId ? Number(req.query.teamId) : undefined;
  const returnTo = req.query?.returnTo;

  await checkInstalled(slug, session.user.id);
  await createDefaultInstallation({
    appType,
    user: session.user,
    slug,
    key: {},
    teamId,
  });

  return { url: returnTo ?? getInstalledAppPath({ variant, slug }) };
}

export default defaultResponder(getHandler);
