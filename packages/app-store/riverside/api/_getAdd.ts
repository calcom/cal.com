import type { NextApiRequest } from "next";

import { defaultResponder } from "@calcom/lib/server";

import checkSession from "../../_utils/auth";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import { checkInstalled, createDefaultInstallation } from "../../_utils/installation";
import { metadata } from "../metadata.generated";

export async function getHandler(req: NextApiRequest) {
  const session = checkSession(req);
  const slug = metadata.slug;
  const appType = metadata.type;
  const returnTo = req.query?.returnTo;

  await checkInstalled(slug, session.user.id);
  await createDefaultInstallation({
    appType,
    user: session.user,
    slug,
    key: {},
  });

  return { url: returnTo ?? getInstalledAppPath({ variant: "conferencing", slug: "riverside" }) };
}

export default defaultResponder(getHandler);
