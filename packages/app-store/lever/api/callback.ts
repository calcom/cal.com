import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL_FOR_OAUTH } from "@calcom/lib/constants";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import createOAuthAppCredential from "../../_utils/oauth/createOAuthAppCredential";
import { decodeOAuthState } from "../../_utils/oauth/decodeOAuthState";
import config from "../config.json";
import { accessTokenUrl } from "./add";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;
  const state = decodeOAuthState(req);
  const { client_id, client_secret } = await getAppKeysFromSlug("lever");

  /** @link https://hire.lever.co/developer/documentation#authentication **/
  const options = {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: JSON.stringify({
      client_id,
      client_secret,
      grant_type: "authorization_code",
      code,
      redirect_uri: `${WEBAPP_URL_FOR_OAUTH}/api/integrations/lever/callback`,
    }),
  };

  const result = await fetch(accessTokenUrl, options);

  if (result.status !== 200) {
    let errorMessage = "Something is wrong with Lever API";
    try {
      const responseBody = await result.json();
      errorMessage = responseBody.message;
    } catch (e) {}

    res.status(400).json({ message: errorMessage });
    return;
  }

  const responseBody = await result.json();

  if (responseBody.message) {
    res.status(400).json({ message: responseBody.message });
    return;
  }

  responseBody.expiry_date = Math.round(Date.now() + responseBody.expires_in * 1000);
  delete responseBody.expires_in;

  const userId = req.session?.user.id;
  if (!userId) {
    return res.status(404).json({ message: "No user found" });
  }

  await createOAuthAppCredential({ appId: config.slug, type: config.type }, responseBody, req);

  res.redirect(
    getSafeRedirectUrl(state?.returnTo) ?? getInstalledAppPath({ variant: config.variant, slug: config.slug })
  );
}
