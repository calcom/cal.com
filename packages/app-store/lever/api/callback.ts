import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL_FOR_OAUTH } from "@calcom/lib/constants";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";

import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import createOAuthAppCredential from "../../_utils/oauth/createOAuthAppCredential";
import { decodeOAuthState } from "../../_utils/oauth/decodeOAuthState";
import appConfig from "../config.json";
import { getLeverAppKeys } from "../lib/getLeverAppKeys";

export interface LeverToken {
  access_token: string;
  token_type: string;
  refresh_token: string;
  scope: string;
  expires_in: number;
  expiryDate?: number;
}

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

  const { client_id, client_secret } = await getLeverAppKeys();

  const redirectUri = `${WEBAPP_URL_FOR_OAUTH}/api/integrations/lever/callback`;

  // Lever uses POST body parameters instead of Basic auth header
  const tokenResponse = await fetch("https://auth.lever.co/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: code || "",
      redirect_uri: redirectUri,
      client_id,
      client_secret,
    }),
  });

  if (!tokenResponse.ok) {
    res
      .status(tokenResponse.status)
      .json({ message: `Failed to exchange OAuth code (status ${tokenResponse.status})` });
    return;
  }

  const leverToken: LeverToken = await tokenResponse.json();

  leverToken.expiryDate = Math.round(Date.now() + leverToken.expires_in * 1000);

  await createOAuthAppCredential({ appId: appConfig.slug, type: appConfig.type }, leverToken, req);

  res.redirect(
    getSafeRedirectUrl(state?.returnTo) ??
      getInstalledAppPath({ variant: appConfig.variant, slug: appConfig.slug })
  );
}
