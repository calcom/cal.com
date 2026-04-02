import { WEBAPP_URL_FOR_OAUTH } from "@calcom/lib/constants";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import type { NextApiRequest, NextApiResponse } from "next";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import createOAuthAppCredential from "../../_utils/oauth/createOAuthAppCredential";
import { decodeOAuthState } from "../../_utils/oauth/decodeOAuthState";
import appConfig from "../config.json";
import { getPipedriveAppKeys } from "../lib/getPipedriveAppKeys";

export interface PipedriveToken {
  access_token: string;
  token_type: string;
  refresh_token: string;
  scope: string;
  expires_in: number;
  api_domain: string;
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

  const { client_id, client_secret } = await getPipedriveAppKeys();

  const redirectUri = `${WEBAPP_URL_FOR_OAUTH}/api/integrations/pipedrive-crm/callback`;
  const authHeader = `Basic ${Buffer.from(`${client_id}:${client_secret}`).toString("base64")}`;

  const tokenResponse = await fetch("https://oauth.pipedrive.com/oauth/token", {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: code || "",
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    const errorBody = await tokenResponse.text();
    res.status(tokenResponse.status).json({ message: "Failed to exchange OAuth code", detail: errorBody });
    return;
  }

  const pipedriveToken: PipedriveToken = await tokenResponse.json();

  pipedriveToken.expiryDate = Math.round(Date.now() + pipedriveToken.expires_in * 1000);

  await createOAuthAppCredential({ appId: appConfig.slug, type: appConfig.type }, pipedriveToken, req);

  res.redirect(
    getSafeRedirectUrl(state?.returnTo) ??
      getInstalledAppPath({ variant: appConfig.variant, slug: appConfig.slug })
  );
}
