import type { NextApiRequest, NextApiResponse } from "next";
import { stringify } from "querystring";

import { WEBAPP_URL_FOR_OAUTH } from "@calcom/lib/constants";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { encodeOAuthState } from "../../_utils/oauth/encodeOAuthState";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    let clientId = "";
    const appKeys = await getAppKeysFromSlug("intercom");
    if (typeof appKeys.client_id === "string") clientId = appKeys.client_id;
    if (!clientId) return res.status(400).json({ message: "Intercom client_id missing." });

    const state = encodeOAuthState(req);

    const params = {
      client_id: clientId,
      redirect_uri: `${WEBAPP_URL_FOR_OAUTH}/api/integrations/intercom/callback`,
      state,
      response_type: "code",
    };

    const authUrl = `https://app.intercom.com/oauth?${stringify(params)}`;

    res.status(200).json({ url: authUrl });
  }
}
