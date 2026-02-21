import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import { HttpError } from "@calcom/lib/http-error";
import { defaultHandler } from "@calcom/lib/server/defaultHandler";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import { decodeOAuthState } from "../../_utils/oauth/decodeOAuthState";
import appConfig from "../config.json";

async function getHandler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;

  const state = decodeOAuthState(req);

  const redirectAfterSuccess =
    getSafeRedirectUrl(state?.returnTo) ??
    getInstalledAppPath({ variant: appConfig.variant, slug: appConfig.slug });
  const redirectAfterSuccessOrError = getSafeRedirectUrl(state?.onErrorReturnTo) ?? redirectAfterSuccess;
  
  if (!code || typeof code !== "string") {
    if (state?.onErrorReturnTo || state?.returnTo) {
      res.redirect(redirectAfterSuccessOrError);
      return;
    }
    throw new HttpError({ statusCode: 400, message: "`code` must be a string" });
  }

  if (!req.session?.user?.id) {
    throw new HttpError({ statusCode: 401, message: "You must be logged in to do this" });
  }

  const { client_id, client_secret, audience } = await getAppKeysFromSlug("lever");

  if (!client_id || typeof client_id !== "string")
    return res.status(400).json({ message: "Lever client_id missing." });
  if (!client_secret || typeof client_secret !== "string")
    return res.status(400).json({ message: "Lever client_secret missing." });

  try {
    const response = await fetch("https://auth.lever.co/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id,
        client_secret,
        grant_type: "authorization_code",
        code: code as string,
        redirect_uri: `${WEBAPP_URL}/api/integrations/lever/callback`,
        audience: (audience as string) || "https://api.lever.co/v1/",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lever OAuth token error:", errorText);
      throw new Error(`Failed to get access token: ${response.status} ${errorText}`);
    }

    const responseJson = await response.json();

    const { access_token, refresh_token, expires_in } = responseJson;
    const expires_at = Date.now() + (expires_in || 86400) * 1000; // Default to 24h if not provided

    await prisma.credential.create({
      data: {
        type: "lever_other",
        key: {
          access_token,
          refresh_token,
          expires_at,
        },
        userId: req.session.user.id,
        appId: "lever",
      },
    });

    return res.redirect(redirectAfterSuccess);
  } catch (error) {
    console.error("Error getting Lever access token", error);
    const errorUrl = new URL(redirectAfterSuccessOrError, WEBAPP_URL);
    errorUrl.searchParams.set("error", "Error getting Lever access token");
    return res.redirect(errorUrl.pathname + errorUrl.search);
  }
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(getHandler) }),
});
