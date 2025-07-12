import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL_FOR_OAUTH } from "@calcom/lib/constants";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import createOAuthAppCredential from "../../_utils/oauth/createOAuthAppCredential";
import { decodeOAuthState } from "../../_utils/oauth/decodeOAuthState";
import metadata from "../_metadata";

export interface DeelToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
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
  const appKeys = await getAppKeysFromSlug("deel");
  if (typeof appKeys.client_id === "string") clientId = appKeys.client_id;
  if (typeof appKeys.client_secret === "string") clientSecret = appKeys.client_secret;
  if (!clientId) return res.status(400).json({ message: "Deel client id missing." });
  if (!clientSecret) return res.status(400).json({ message: "Deel client secret missing." });

  const tokenResponse = await fetch("https://app.letsdeel.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: code as string,
      redirect_uri: `${WEBAPP_URL_FOR_OAUTH}/api/integrations/deel/callback`,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  const deelToken: DeelToken = await tokenResponse.json();

  deelToken.expiryDate = Math.round(Date.now() + deelToken.expires_in * 1000);

  await createOAuthAppCredential({ appId: metadata.slug, type: metadata.type }, deelToken, req);

  res.redirect(
    getSafeRedirectUrl(state?.returnTo) ?? getInstalledAppPath({ variant: "other", slug: "deel" })
  );
}
