import { serialize } from "cookie";
import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL_FOR_OAUTH } from "@calcom/lib/constants";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import createOAuthAppCredential from "../../_utils/oauth/createOAuthAppCredential";
import createOAuthAppCredentialDirect from "../../_utils/oauth/createOAuthAppCredentialDirect";
import { decodeOAuthState } from "../../_utils/oauth/decodeOAuthState";
import appConfig from "../config.json";

export interface PipedriveToken {
  access_token: string;
  token_type: string;
  refresh_token: string;
  scope: string;
  expires_in: number;
  api_domain: string;
  expiryDate?: number;
}

export async function exchangePipedriveCode(code: string, userId: number) {
  let clientId = "";
  let clientSecret = "";
  const appKeys = await getAppKeysFromSlug(appConfig.slug);
  if (typeof appKeys.client_id === "string") clientId = appKeys.client_id;
  if (typeof appKeys.client_secret === "string") clientSecret = appKeys.client_secret;
  if (!clientId) throw new Error("Pipedrive client id missing.");
  if (!clientSecret) throw new Error("Pipedrive client secret missing.");

  const tokenResponse = await fetch("https://oauth.pipedrive.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${WEBAPP_URL_FOR_OAUTH}/api/integrations/${appConfig.slug}/callback`,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    console.error("Pipedrive token exchange failed:", error);
    throw new Error("Failed to exchange authorization code");
  }

  const pipedriveToken: PipedriveToken = await tokenResponse.json();
  pipedriveToken.expiryDate = Math.round(Date.now() + pipedriveToken.expires_in * 1000);

  await createOAuthAppCredentialDirect({ appId: appConfig.slug, type: appConfig.type }, pipedriveToken, userId);
  await createOAuthAppCredentialDirect(
    { appId: appConfig.slug, type: `${appConfig.slug}_other_calendar` },
    pipedriveToken,
    userId
  );

  return pipedriveToken;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("Pipedrive OAuth callback received with query:", req.query);
  const { code } = req.query;
  const state = decodeOAuthState(req);

  if (!code || typeof code !== "string") {
    return res.status(400).json({ message: "`code` must be a string" });
  }

  if (!req.session?.user?.id) {
    res.setHeader(
      "Set-Cookie",
      serialize("pipedrive_oauth_code", code, {
        maxAge: 60 * 60,
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      })
    );
    return res.redirect(
      `/auth/login?callbackUrl=${getInstalledAppPath({ variant: appConfig.variant, slug: appConfig.slug })}`
    );
  }

  try {
    await exchangePipedriveCode(code, req.session.user.id);

    res.redirect(
      getSafeRedirectUrl(state?.returnTo) ??
        getInstalledAppPath({ variant: appConfig.variant, slug: appConfig.slug })
    );
  } catch (error: unknown) {
    console.error("Error in Pipedrive OAuth callback:", error);
    if (error instanceof Error && error.message.includes("missing")) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Internal server error during OAuth flow" });
  }
}
