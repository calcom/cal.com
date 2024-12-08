import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server";

import checkSession from "../../_utils/auth";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import { checkInstalled, createDefaultInstallation } from "../../_utils/installation";
import { metadata } from "../metadata.generated";

export async function getHandler(req: NextApiRequest) {
  const session = checkSession(req);
  const slug = metadata.slug;
  const variant = metadata.variant;
  const appType = metadata.type;
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
