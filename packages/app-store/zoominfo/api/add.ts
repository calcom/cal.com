import { WEBAPP_URL_FOR_OAUTH } from "@calcom/lib/constants";
import type { NextApiRequest, NextApiResponse } from "next";
import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { encodeOAuthState } from "../../_utils/oauth/encodeOAuthState";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });

  const appKeys = await getAppKeysFromSlug("zoominfo");
  let clientId = "";
  if (typeof appKeys.client_id === "string") clientId = appKeys.client_id;
  if (!clientId) return res.status(400).json({ message: "ZoomInfo client id missing." });

  const redirectUri = `${WEBAPP_URL_FOR_OAUTH}/api/integrations/zoominfo/callback`;
  const state = encodeOAuthState(req);

  const url = `https://api.zoominfo.com/oauth/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${state}`;

  res.status(200).json({ url });
}
