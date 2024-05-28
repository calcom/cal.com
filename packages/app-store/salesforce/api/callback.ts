import jsforce from "jsforce";
import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL_FOR_OAUTH } from "@calcom/lib/constants";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import createOAuthAppCredential from "../../_utils/oauth/createOAuthAppCredential";
import { decodeOAuthState } from "../../_utils/oauth/decodeOAuthState";
import appConfig from "../config.json";

let consumer_key = "";
let consumer_secret = "";

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

  const appKeys = await getAppKeysFromSlug("salesforce");
  if (typeof appKeys.consumer_key === "string") consumer_key = appKeys.consumer_key;
  if (typeof appKeys.consumer_secret === "string") consumer_secret = appKeys.consumer_secret;
  if (!consumer_key) return res.status(400).json({ message: "Salesforce consumer key missing." });
  if (!consumer_secret) return res.status(400).json({ message: "Salesforce consumer secret missing." });

  const conn = new jsforce.Connection({
    clientId: consumer_key,
    clientSecret: consumer_secret,
    redirectUri: `${WEBAPP_URL_FOR_OAUTH}/api/integrations/salesforce/callback`,
  });

  const salesforceTokenInfo = await conn.oauth2.requestToken(code as string);

  await createOAuthAppCredential({ appId: appConfig.slug, type: appConfig.type }, salesforceTokenInfo, req);

  if (state?.appOnboardingRedirectUrl && state.appOnboardingRedirectUrl !== "") {
    return res.redirect(state.appOnboardingRedirectUrl);
  }

  res.redirect(
    getSafeRedirectUrl(state?.returnTo) ?? getInstalledAppPath({ variant: "other", slug: "salesforce" })
  );
}
