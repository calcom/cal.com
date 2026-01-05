import type { NextApiRequest, NextApiResponse } from "next";

import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import { WEBAPP_URL_FOR_OAUTH } from "@calcom/lib/constants";

import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import { decodeOAuthState } from "../../_utils/oauth/decodeOAuthState";
import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import createOAuthAppCredential from "../../_utils/oauth/createOAuthAppCredential";
import appConfig from "../config.json";

type PipedriveToken = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  expiryDate?: number;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;
  const state = decodeOAuthState(req);

  if (code && typeof code !== "string") {
    res.status(400).json({ message: "`code` must be a string" });
    return;
  }

  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }

  let clientId = "";
  let clientSecret = "";
  const appKeys = await getAppKeysFromSlug(appConfig.slug);
  if (typeof appKeys.client_id === "string") clientId = appKeys.client_id;
  if (typeof appKeys.client_secret === "string") clientSecret = appKeys.client_secret;
  if (!clientId) return res.status(400).json({ message: "Pipedrive client id missing." });
  if (!clientSecret) return res.status(400).json({ message: "Pipedrive client secret missing." });

  // Exchange code for tokens
  const redirectUri = `${WEBAPP_URL_FOR_OAUTH}/api/integrations/pipedrive/callback`;
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code: code as string,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  });

  const tokenRes = await fetch("https://oauth.pipedrive.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    return res.status(500).json({ message: "Failed to exchange code for token", details: err });
  }

  const pipedriveToken = (await tokenRes.json()) as PipedriveToken;
  // set expiry date as offset from current time if expires_in present
  if (pipedriveToken.expires_in) {
    pipedriveToken.expiryDate = Math.round(Date.now() + pipedriveToken.expires_in * 1000);
  }

  await createOAuthAppCredential({ appId: appConfig.slug, type: appConfig.type }, pipedriveToken, req);

  res.redirect(
    getSafeRedirectUrl(state?.returnTo) ?? getInstalledAppPath({ variant: appConfig.variant, slug: appConfig.slug })
  );
}
