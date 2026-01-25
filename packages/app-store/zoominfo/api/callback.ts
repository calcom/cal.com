import { WEBAPP_URL_FOR_OAUTH } from "@calcom/lib/constants";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import type { NextApiRequest, NextApiResponse } from "next";
import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import createOAuthAppCredential from "../../_utils/oauth/createOAuthAppCredential";
import { decodeOAuthState } from "../../_utils/oauth/decodeOAuthState";
import appConfig from "../config.json";

export interface ZoomInfoToken {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
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

  let clientId = "";
  let clientSecret = "";
  const appKeys = await getAppKeysFromSlug("zoominfo");
  if (typeof appKeys.client_id === "string") clientId = appKeys.client_id;
  if (typeof appKeys.client_secret === "string") clientSecret = appKeys.client_secret;
  if (!clientId) return res.status(400).json({ message: "ZoomInfo client id missing." });
  if (!clientSecret) return res.status(400).json({ message: "ZoomInfo client secret missing." });

  const redirectUri = `${WEBAPP_URL_FOR_OAUTH}/api/integrations/zoominfo/callback`;

  const tokenResponse = await fetch("https://api.zoominfo.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: code as string,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    return res.status(400).json({ message: `Failed to get ZoomInfo token: ${error}` });
  }

  const zoominfoToken: ZoomInfoToken = await tokenResponse.json();
  zoominfoToken.expiryDate = Math.round(Date.now() + zoominfoToken.expires_in * 1000);

  await createOAuthAppCredential({ appId: appConfig.slug, type: appConfig.type }, zoominfoToken, req);

  res.redirect(
    getSafeRedirectUrl(state?.returnTo) ?? getInstalledAppPath({ variant: "other", slug: "zoominfo" })
  );
}
