import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL_FOR_OAUTH } from "@calcom/lib/constants";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import createOAuthAppCredential from "../../_utils/oauth/createOAuthAppCredential";
import { decodeOAuthState } from "../../_utils/oauth/decodeOAuthState";
import metadata from "../_metadata";

export interface LeverToken {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  expiryDate?: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;
  const state = decodeOAuthState(req);

  if (!code || typeof code !== "string") {
    return res.status(400).json({ message: "Missing or invalid `code` parameter" });
  }

  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }

  const appKeys = await getAppKeysFromSlug("lever");
  const clientId = typeof appKeys.client_id === "string" ? appKeys.client_id : "";
  const clientSecret = typeof appKeys.client_secret === "string" ? appKeys.client_secret : "";

  if (!clientId) return res.status(400).json({ message: "Lever client_id missing." });
  if (!clientSecret) return res.status(400).json({ message: "Lever client_secret missing." });

  const redirectUri = `${WEBAPP_URL_FOR_OAUTH}/api/integrations/lever/callback`;

  const tokenResponse = await fetch("https://auth.lever.co/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    console.error("Lever token exchange failed:", tokenResponse.status);
    return res.status(500).json({ message: "Failed to complete Lever connection" });
  }

  const tokens: LeverToken = await tokenResponse.json();
  tokens.expiryDate = Math.round(Date.now() + tokens.expires_in * 1000);

  await createOAuthAppCredential({ appId: metadata.slug, type: metadata.type }, tokens, req);

  res.redirect(
    getSafeRedirectUrl(state?.returnTo) ?? getInstalledAppPath({ variant: "crm", slug: "lever" })
  );
}
