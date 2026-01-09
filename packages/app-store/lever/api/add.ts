import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL_FOR_OAUTH } from "@calcom/lib/constants";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { encodeOAuthState } from "../../_utils/oauth/encodeOAuthState";

const scopes = ["opportunities:write:admin", "notes:write:admin", "offline_access"];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const appKeys = await getAppKeysFromSlug("lever");
  const clientId = typeof appKeys.client_id === "string" ? appKeys.client_id : "";

  if (!clientId) {
    return res.status(400).json({ message: "Lever client_id missing." });
  }

  const redirectUri = `${WEBAPP_URL_FOR_OAUTH}/api/integrations/lever/callback`;

  const state = encodeOAuthState(req);
  const params = new URLSearchParams();
  params.set("client_id", clientId);
  params.set("redirect_uri", redirectUri);
  params.set("response_type", "code");
  params.set("scope", scopes.join(" "));
  params.set("audience", "https://api.lever.co/v1/");
  if (state) params.set("state", state);

  res.status(200).json({ url: `https://auth.lever.co/authorize?${params}` });
}
