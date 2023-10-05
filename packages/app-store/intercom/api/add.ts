import type { NextApiRequest, NextApiResponse } from "next";
import { stringify } from "querystring";

import { WEBAPP_URL_FOR_OAUTH } from "@calcom/lib/constants";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { encodeOAuthState } from "../../_utils/oauth/encodeOAuthState";

let client_id = "";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const appKeys = await getAppKeysFromSlug("intercom");
    if (typeof appKeys.client_id === "string") client_id = appKeys.client_id;
    if (!client_id) return res.status(400).json({ message: "Intercom client_id missing." });

    const state = encodeOAuthState(req);

    const params = {
      client_id,
      redirect_uri: `${WEBAPP_URL_FOR_OAUTH}/api/integrations/intercom/callback`,
      state,
      response_type: "code",
    };

    const authUrl = `https://app.intercom.com/oauth?${stringify(params)}`;

    res.status(200).json({ url: authUrl });
  }
}
