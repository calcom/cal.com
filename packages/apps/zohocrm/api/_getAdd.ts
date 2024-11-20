import type { NextApiRequest, NextApiResponse } from "next";
import { stringify } from "querystring";

import { WEBAPP_URL } from "@calcom/lib/constants";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { encodeOAuthState } from "../../_utils/oauth/encodeOAuthState";

let client_id = "";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const appKeys = await getAppKeysFromSlug("zohocrm");
  if (typeof appKeys.client_id === "string") client_id = appKeys.client_id;
  if (!client_id) return res.status(400).json({ message: "zohocrm client id missing." });
  const state = encodeOAuthState(req);

  const params = {
    client_id,
    response_type: "code",
    redirect_uri: `${WEBAPP_URL}/api/integrations/zohocrm/callback`,
    scope: ["ZohoCRM.modules.ALL", "ZohoCRM.users.READ", "AaaServer.profile.READ"],
    access_type: "offline",
    state,
    prompt: "consent",
  };

  const query = stringify(params);
  const url = `https://accounts.zoho.com/oauth/v2/auth?${query}`;

  res.status(200).json({ url });
}
