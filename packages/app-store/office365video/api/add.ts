import type { NextApiRequest, NextApiResponse } from "next";
import { stringify } from "querystring";

import { WEBAPP_URL_FOR_OAUTH } from "@calcom/lib/constants";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { encodeOAuthState } from "../../_utils/oauth/encodeOAuthState";

export const OFFICE365_VIDEO_SCOPES = ["OnlineMeetings.ReadWrite", "offline_access"];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    let clientId = "";
    const appKeys = await getAppKeysFromSlug("msteams");
    if (typeof appKeys.client_id === "string") clientId = appKeys.client_id;
    if (!clientId) return res.status(400).json({ message: "Office 365 client_id missing." });
    const state = encodeOAuthState(req);
    const params = {
      response_type: "code",
      scope: OFFICE365_VIDEO_SCOPES.join(" "),
      client_id: clientId,
      redirect_uri: `${WEBAPP_URL_FOR_OAUTH}/api/integrations/office365video/callback`,
      state,
    };
    const query = stringify(params);
    const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${query}`;
    res.status(200).json({ url });
  }
}
