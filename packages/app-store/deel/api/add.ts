import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL_FOR_OAUTH } from "@calcom/lib/constants";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { encodeOAuthState } from "../../_utils/oauth/encodeOAuthState";

const scopes = ["time-off:write", "time-off:read", "people:read"];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });

  const appKeys = await getAppKeysFromSlug("deel");
  let clientId = "";
  if (typeof appKeys.client_id === "string") clientId = appKeys.client_id;
  if (!clientId) return res.status(400).json({ message: "Deel client id missing." });

  const redirectUri = `${WEBAPP_URL_FOR_OAUTH}/api/integrations/deel/callback`;
  const state = encodeOAuthState(req);

  const authUrl = new URL("https://app.letsdeel.com/oauth/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", scopes.join(" "));
  if (state) {
    authUrl.searchParams.set("state", state);
  }

  res.status(200).json({ url: authUrl.toString() });
}
