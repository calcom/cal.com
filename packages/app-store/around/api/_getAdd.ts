import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server";

import checkSession from "../../_utils/auth";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import { checkInstalled, createDefaultInstallation } from "../../_utils/installation";
import appConfig from "../config.json";

export async function getHandler(req: NextApiRequest) {
  const session = checkSession(req);
  const slug = appConfig.slug;
  const variant = appConfig.variant;
  const appType = appConfig.type;
  const teamId = req.query.teamId ? Number(req.query.teamId) : undefined;

  await checkInstalled(slug, session.user.id);
  await createDefaultInstallation({
    appType,
    user: session.user,
    slug,
    key: {},
    teamId,
  });

  return { url: getInstalledAppPath({ variant, slug }) };
}

export default defaultResponder(getHandler);
