import type { NextApiRequest, NextApiResponse } from "next";
import { stringify } from "querystring";

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
  const params = {
    client_id: (appKeys.client_id || "") as string,
    client_secret: (appKeys.client_secret || "") as string,
    response_type: "code",
    state: req.query.state,
    tentId: req.query.tentId,
  };
  const query = stringify(params);

  return res.status(200).json({
    url: `/apps/pipedrive-crm/setup?${query}`,
  });
}
