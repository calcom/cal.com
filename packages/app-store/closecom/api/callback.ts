import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import { HttpError } from "@calcom/lib/http-error";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";
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

  const { client_id, client_secret } = await getAppKeysFromSlug("closecom");

  if (!client_id || typeof client_id !== "string")
    return res.status(400).json({ message: "Close.com client_id missing." });
  if (!client_secret || typeof client_secret !== "string")
    return res.status(400).json({ message: "Close.com client_secret missing." });

  try {
    const response = await fetch("https://api.close.com/oauth2/token/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id,
        client_secret,
        grant_type: "authorization_code",
        code: code as string,
        redirect_uri: `${WEBAPP_URL}/api/integrations/closecom/callback`,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to get access token");
    }

    const responseJson = await response.json();

    const { access_token, refresh_token, expires_in } = responseJson;
    const expires_at = Date.now() + expires_in * 1000;

    await prisma.credential.create({
      data: {
        type: "closecom_crm",
        key: {
          access_token,
          refresh_token,
          expires_at,
        },
        userId: req.session.user.id,
        appId: "closecom",
      },
    });

    return res.redirect(redirectAfterSuccess);
  } catch (error) {
    console.error("Error getting close.com access token", error);
    return res.redirect(`${redirectAfterSuccessOrError}?error=Error getting close.com access token`);
  }
}

export default defaultHandler({
  GET: Promise.resolve({ default: defaultResponder(getHandler) }),
});
