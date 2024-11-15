import type { NextApiRequest, NextApiResponse } from "next";

import checkSession from "../../_utils/auth";
import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { checkInstalled } from "../../_utils/installation";
import appConfig from "../config.json";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });

  //this need to be accessed by admin only. need to conform
  //get only enabled app credentials
  const appKeys = await getAppKeysFromSlug(appConfig.slug, true);
  const session = checkSession(req);
  await checkInstalled("pipedrive-crm", session.user?.id);
  return res.status(200).json({
    url: `/apps/pipedrive-crm/setup?client_id=${appKeys.client_id}&client_secret=${appKeys.client_secret}`,
  });
}
