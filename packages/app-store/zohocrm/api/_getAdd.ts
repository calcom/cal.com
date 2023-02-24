import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL } from "@calcom/lib/constants";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";

let client_id = "";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const appKeys = await getAppKeysFromSlug("zohocrm");
  if (typeof appKeys.client_id === "string") client_id = appKeys.client_id;
  if (!client_id) return res.status(400).json({ message: "zohocrm client id missing." });

  const redirectUri = WEBAPP_URL + "/api/integrations/zohocrm/callback";
  const url = `https://accounts.zoho.com/oauth/v2/auth?scope=ZohoCRM.modules.ALL,ZohoCRM.users.READ,AaaServer.profile.READ&client_id=${client_id}&response_type=code&access_type=offline&redirect_uri=${redirectUri}`;
  res.status(200).json({ url });
}
