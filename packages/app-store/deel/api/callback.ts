import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL_FOR_OAUTH } from "@calcom/lib/constants";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import createOAuthAppCredential from "../../_utils/oauth/createOAuthAppCredential";
import { decodeOAuthState } from "../../_utils/oauth/decodeOAuthState";
import appConfig from "../config.json";
import { DeelClient } from "../lib/deelClient";
import type { DeelCredentialKey } from "../types";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;
  const state = decodeOAuthState(req);

  if (!code || typeof code !== "string") {
    return res.status(400).json({ message: "`code` must be a string" });
  }

  if (!req.session?.user?.id) {
    return res.status(401).json({ message: "You must be logged in to do this" });
  }

  const appKeys = await getAppKeysFromSlug("deel");
  const clientId = appKeys.client_id as string;
  const clientSecret = appKeys.client_secret as string;

  if (!clientId) {
    return res.status(400).json({ message: "Deel client ID missing." });
  }

  if (!clientSecret) {
    return res.status(400).json({ message: "Deel client secret missing." });
  }

  const redirectUri = `${WEBAPP_URL_FOR_OAUTH}/api/integrations/deel/callback`;

  try {
    const tokenData = await DeelClient.exchangeCodeForToken(code, redirectUri, clientId, clientSecret);

    const tempCredentialKey: DeelCredentialKey = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: Date.now() + tokenData.expires_in * 1000,
    };

    const deelClient = new DeelClient(0, tempCredentialKey, clientId, clientSecret);
    const employee = await deelClient.getCurrentEmployee();

    const credentialKey: DeelCredentialKey = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: Date.now() + tokenData.expires_in * 1000,
      employee_id: employee.id,
    };

    await createOAuthAppCredential({ appId: appConfig.slug, type: appConfig.type }, credentialKey, req);

    res.redirect(
      getSafeRedirectUrl(state?.returnTo) ?? getInstalledAppPath({ variant: "other_calendar", slug: "deel" })
    );
  } catch (error) {
    console.error("Error during Deel OAuth callback:", error);
    return res.status(500).json({ message: "Failed to complete OAuth flow" });
  }
}
