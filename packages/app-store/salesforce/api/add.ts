import { WEBAPP_URL_FOR_OAUTH } from "@calcom/lib/constants";
import jsforce from "@jsforce/jsforce-node";
import type { NextApiRequest, NextApiResponse } from "next";
import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import { encodeOAuthState } from "../../_utils/oauth/encodeOAuthState";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ message: "Method not allowed" });

  let consumerKey = "";
  const appKeys = await getAppKeysFromSlug("salesforce");
  if (typeof appKeys.consumer_key === "string") consumerKey = appKeys.consumer_key;
  if (!consumerKey) return res.status(400).json({ message: "Salesforce client id missing." });

  const salesforceClient = new jsforce.Connection({
    oauth2: {
      clientId: consumerKey,
      redirectUri: `${WEBAPP_URL_FOR_OAUTH}/api/integrations/salesforce/callback`,
    },
  });

  const state = encodeOAuthState(req);

  const url = salesforceClient.oauth2.getAuthorizationUrl({
    scope: "refresh_token full",
    ...(state && { state }),
  });
  res.status(200).json({ url });
}
