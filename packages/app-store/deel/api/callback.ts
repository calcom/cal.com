import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { isENVDev } from "@calcom/lib/env";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import { HttpError } from "@calcom/lib/http-error";

import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import getParsedAppKeysFromSlug from "../../_utils/getParsedAppKeysFromSlug";
import createOAuthAppCredential from "../../_utils/oauth/createOAuthAppCredential";
import { decodeOAuthState } from "../../_utils/oauth/decodeOAuthState";
import { appKeysSchema } from "../zod";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;

  const state = decodeOAuthState(req);

  if (typeof code !== "string") {
    if (state?.onErrorReturnTo || state?.returnTo) {
      res.redirect(
        getSafeRedirectUrl(state.onErrorReturnTo) ??
          getSafeRedirectUrl(state?.returnTo) ??
          `${WEBAPP_URL}/apps/installed`
      );
      return;
    }
    throw new HttpError({ statusCode: 400, message: "`code` must be a string" });
  }

  console.log(req.session);
  if (!req.session?.user?.id) {
    throw new HttpError({ statusCode: 401, message: "You must be logged in to do this" });
  }

  const { client_id, redirect_uris, client_secret } = await getParsedAppKeysFromSlug("deel", appKeysSchema);

  const codeExchangeUrl = `https://app.${isENVDev ? "demo." : ""}deel.com/oauth2/tokens`;

  const result = await fetch(codeExchangeUrl, {
    method: "POST",
    body: new URLSearchParams({
      code,
      redirect_uri: redirect_uris,
      grant_type: "authorization_code",
    }).toString(),
    headers: {
      Authorization: `Basic ${Buffer.from(`${client_id}:${client_secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  if (result.status !== 200) {
    let errorMessage = "Something is wrong with deel api";
    console.log("something is wrong");
    try {
      const responseBody = await result.json();
      console.log("responseBody: ", responseBody);
      if (typeof responseBody?.error_description === "string") {
        errorMessage = responseBody.error_description;
      }
    } catch (err) {}

    return res.status(400).json({ message: errorMessage });
  }

  const responseBody = await result.json();

  responseBody.expiry_date = Math.round(Date.now() + responseBody.expires_in * 1000);
  delete responseBody.expires_in;

  await createOAuthAppCredential({ appId: "deel", type: "deel" }, responseBody, req);

  res.redirect(
    getSafeRedirectUrl(state?.returnTo) ?? getInstalledAppPath({ variant: "other", slug: "deel" })
  );
}
