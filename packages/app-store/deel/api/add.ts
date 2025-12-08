import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL_FOR_OAUTH } from "@calcom/lib/constants";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { encodeOAuthState } from "../../_utils/oauth/encodeOAuthState";
import { DeelClient } from "../lib/deelClient";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const appKeys = await getAppKeysFromSlug("deel");
  const clientId = appKeys.client_id as string;

  if (!clientId) {
    return res.status(400).json({ message: "Deel client ID missing." });
  }

  const redirectUri = `${WEBAPP_URL_FOR_OAUTH}/api/integrations/deel/callback`;
  const state = encodeOAuthState(req);

  const url = DeelClient.getAuthorizationUrl(state || "", redirectUri, clientId);

  res.status(200).json({ url });
}
