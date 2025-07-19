import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL_FOR_OAUTH } from "@calcom/lib/constants";
import CrmManager from "@calcom/lib/crmManager/crmManager";
import { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { CredentialRepository } from "@calcom/lib/server/repository/credential";

import getAppKeysFromSlug from "../../_utils/getAppKeysFromSlug";
import getInstalledAppPath from "../../_utils/getInstalledAppPath";
import createOAuthAppCredential from "../../_utils/oauth/createOAuthAppCredential";
import { decodeOAuthState } from "../../_utils/oauth/decodeOAuthState";
import appConfig from "../config.json";

const log = logger.getSubLogger({ prefix: [`[[app-store/attio/callback]]`] });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;
  const state = decodeOAuthState(req);

  if (code === undefined || typeof code !== "string") {
    if (state?.onErrorReturnTo || state?.returnTo) {
      res.redirect(
        getSafeRedirectUrl(state.onErrorReturnTo) ??
          getSafeRedirectUrl(state?.returnTo) ??
          getInstalledAppPath({ variant: "other", slug: "attio" })
      );
      return;
    }
    throw new HttpError({ statusCode: 400, message: "`code` must be a string" });
  }

  if (!req.session?.user?.id) {
    throw new HttpError({ statusCode: 401, message: "You must be logged in to do this" });
  }

  const appKeys = await getAppKeysFromSlug("attio");
  const { client_id, client_secret } = appKeys;

  if (!client_id || typeof client_id !== "string") {
    return res.status(400).json({ message: "Attio client id missing." });
  }
  if (!client_secret || typeof client_secret !== "string") {
    return res.status(400).json({ message: "Attio client secret missing." });
  }

  const response = await fetch("https://app.attio.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id,
      client_secret,
      grant_type: "authorization_code",
      code: code,
      redirect_uri: `${WEBAPP_URL_FOR_OAUTH}/api/integrations/attio/callback`,
    }),
  });

  if (!response.ok) {
    const data = await response.json();
    log.error(data?.error, " ", data?.message);
    throw new HttpError({
      statusCode: 400,
      message: data?.message ? data.message : "Failed to get Attio access token",
    });
  }

  const responseBody = await response.json();

  const credential = await createOAuthAppCredential(
    { appId: appConfig.slug, type: appConfig.type },
    responseBody,
    req,
    true
  );

  const crm = new CrmManager(credential);
  try {
    await crm.createCustomEventObject("Event", "Events");
  } catch (err) {
    log.error(`Error creating custom object in attio: `, safeStringify(err));
    // Cannot use attio without having the custom event object
    await CredentialRepository.deleteById({
      id: credential.id,
    });
    throw new Error("Failed to create attio event object");
  }

  res.redirect(
    getSafeRedirectUrl(state?.returnTo) ?? getInstalledAppPath({ variant: "other", slug: "attio" })
  );
}
