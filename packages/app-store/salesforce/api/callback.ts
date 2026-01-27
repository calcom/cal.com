import jsforce from "@jsforce/jsforce-node";
import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL_FOR_OAUTH } from "@calcom/lib/constants";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import createOAuthAppCredential from "../../_utils/oauth/createOAuthAppCredential";
import { decodeOAuthState } from "../../_utils/oauth/decodeOAuthState";
import appConfig from "../config.json";
import { getSalesforceTokenLifetime } from "../lib/getSalesforceTokenLifetime";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;
  const state = decodeOAuthState(req);

  if (code === undefined && typeof code !== "string") {
    res.status(400).json({ message: "`code` must be a string" });
    return;
  }

  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }

  let consumerKey = "";
  let consumerSecret = "";
  const appKeys = await getAppKeysFromSlug("salesforce");
  if (typeof appKeys.consumer_key === "string") consumerKey = appKeys.consumer_key;
  if (typeof appKeys.consumer_secret === "string") consumerSecret = appKeys.consumer_secret;
  if (!consumerKey) return res.status(400).json({ message: "Salesforce consumer key missing." });
  if (!consumerSecret) return res.status(400).json({ message: "Salesforce consumer secret missing." });

  const conn = new jsforce.Connection({
    oauth2: {
      clientId: consumerKey,
      clientSecret: consumerSecret,
      redirectUri: `${WEBAPP_URL_FOR_OAUTH}/api/integrations/salesforce/callback`,
    },
  });

  const salesforceTokenInfo = await conn.oauth2.requestToken(code as string);

  // Get token lifetime via introspection
  const tokenLifetime = await getSalesforceTokenLifetime({
    accessToken: salesforceTokenInfo.access_token,
    instanceUrl: salesforceTokenInfo.instance_url,
  });

  // Store token with token_lifetime
  await createOAuthAppCredential(
    { appId: appConfig.slug, type: appConfig.type },
    { ...salesforceTokenInfo, token_lifetime: tokenLifetime },
    req
  );

  res.redirect(
    getSafeRedirectUrl(state?.returnTo) ?? getInstalledAppPath({ variant: "other", slug: "salesforce" })
  );
}
