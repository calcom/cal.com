import getParsedAppKeysFromSlug from "_utils/getParsedAppKeysFromSlug";
import { deelAuthUrl } from "deel/lib/constants";
import { appKeysSchema } from "deel/zod";
import type { NextApiRequest, NextApiResponse } from "next";

import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";

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

  const { client_id, client_secret, redirect_uris } = await getParsedAppKeysFromSlug("deel", appKeysSchema);

  const tokenResponse = await fetch(`${deelAuthUrl}/oauth2/tokens`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${client_id}:${client_secret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: code as string,
      redirect_uri: redirect_uris,
      //for testing, remove later
      // redirect_uri: `https://a309c11eafec.ngrok-free.app/api/integrations/deel/callback`,
    }),
  });

  const deelToken: DeelToken = await tokenResponse.json();

  deelToken.expiryDate = Math.round(Date.now() + deelToken.expires_in * 1000);

  await createOAuthAppCredential({ appId: metadata.slug, type: metadata.type }, deelToken, req);

  res.redirect(
    getSafeRedirectUrl(state?.returnTo) ?? getInstalledAppPath({ variant: "other", slug: "deel" })
  );
}
