import type { NextApiRequest, NextApiResponse } from "next";

import { defaultResponder } from "@calcom/lib/server";

import checkSession from "../../_utils/auth";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import { checkInstalled, createDefaultInstallation } from "../../_utils/installation";
import metadata from "../_metadata";

export async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const session = checkSession(req);
  const slug = metadata.slug;
  const appType = metadata.type;

  await checkInstalled(slug, session.user.id);
  await createDefaultInstallation({
    appType,
    userId: session.user.id,
    slug,
    key: {},
  });

  return { url: getInstalledAppPath({ variant: "conferencing", slug: "riverside" }) };
}

export default defaultResponder(getHandler);
